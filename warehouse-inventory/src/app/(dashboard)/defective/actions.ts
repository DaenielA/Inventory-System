"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { defectiveItems, materialSerials, inventoryTransactions, inventoryTransactionItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateTransactionNumber } from "@/lib/transaction-numbers";
import { z } from "zod";

const logSchema = z.object({
  materialId: z.string().uuid(),
  serialId: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  workOrderId: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  defectReason: z.string().min(1, "Defect reason is required"),
  description: z.string().optional(),
  reportedAt: z.string().min(1, "Date/time is required"),
});

export async function logDefectiveAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const parsed = logSchema.safeParse({
    materialId: formData.get("materialId"),
    serialId: formData.get("serialId") || undefined,
    technicianId: formData.get("technicianId") || undefined,
    workOrderId: formData.get("workOrderId") || undefined,
    warehouseId: formData.get("warehouseId"),
    defectReason: formData.get("defectReason"),
    description: formData.get("description") || undefined,
    reportedAt: formData.get("reportedAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data } = parsed;

  try {
    await db.transaction(async (tx) => {
      const now = new Date(data.reportedAt);

      // Count existing INSPECT transactions for sequence
      const countRes = await tx.execute(
        `SELECT COUNT(*) as cnt FROM inventory_transactions WHERE transaction_number LIKE 'INP-${now.toISOString().slice(0,10).replace(/-/g,"")}-%'`
      );
      const seq = Number((countRes as unknown as {cnt:string}[])[0]?.cnt ?? 0) + 1;
      const txNumber = generateTransactionNumber("INSPECT", seq, now);

      const [transaction] = await tx.insert(inventoryTransactions).values({
        transactionNumber: txNumber,
        type: "INSPECT",
        warehouseId: data.warehouseId,
        technicianId: data.technicianId ?? null,
        performedById: session.user.id,
        transactedAt: now,
      }).returning();

      await tx.insert(inventoryTransactionItems).values({
        transactionId: transaction.id,
        materialId: data.materialId,
        serialId: data.serialId ?? null,
        quantity: "1",
        quantityDelta: "0",
        fromStatus: "RETURNED_DEFECTIVE",
        toStatus: "FOR_INSPECTION",
      });

      await tx.insert(defectiveItems).values({
        materialId: data.materialId,
        serialId: data.serialId ?? null,
        technicianId: data.technicianId ?? null,
        workOrderId: data.workOrderId ?? null,
        defectReason: data.defectReason,
        defectDescription: data.description ?? null,
        disposition: "PENDING",
      });

      if (data.serialId) {
        await tx.update(materialSerials).set({ status: "FOR_INSPECTION", updatedAt: now })
          .where(eq(materialSerials.id, data.serialId));
      }
    });

    revalidatePath("/defective");
    revalidatePath("/inventory");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to log defective item." };
  }
}

const resolveSchema = z.object({
  id: z.string().uuid(),
  disposition: z.enum(["RETURNED_TO_STOCK", "FOR_REPAIR", "REPLACED", "VENDOR_RETURN", "SCRAPPED", "UNDER_INVESTIGATION"]),
  inspectionResult: z.string().min(1, "Inspection result is required"),
  inspectedAt: z.string().min(1, "Inspection date/time is required"),
  notes: z.string().optional(),
});

export async function resolveDefectiveAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const parsed = resolveSchema.safeParse({
    id: formData.get("id"),
    disposition: formData.get("disposition"),
    inspectionResult: formData.get("inspectionResult"),
    inspectedAt: formData.get("inspectedAt"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data } = parsed;

  const dispositionToStatus: Record<string, string> = {
    RETURNED_TO_STOCK: "AVAILABLE",
    FOR_REPAIR: "FOR_REPAIR",
    REPLACED: "SCRAPPED",
    VENDOR_RETURN: "SCRAPPED",
    SCRAPPED: "SCRAPPED",
    UNDER_INVESTIGATION: "FOR_INSPECTION",
  };

  try {
    const [item] = await db.select().from(defectiveItems).where(eq(defectiveItems.id, data.id));
    if (!item) return { error: "Defective item not found." };

    await db.update(defectiveItems).set({
      disposition: data.disposition,
      inspectionNotes: data.inspectionResult,
      inspectedById: session.user.id,
      inspectedAt: new Date(data.inspectedAt),
      resolvedAt: new Date(data.inspectedAt),
      updatedAt: new Date(),
    }).where(eq(defectiveItems.id, data.id));

    if (item.serialId) {
      await db.update(materialSerials).set({
        status: dispositionToStatus[data.disposition] as "AVAILABLE" | "FOR_REPAIR" | "SCRAPPED" | "FOR_INSPECTION",
        updatedAt: new Date(),
      }).where(eq(materialSerials.id, item.serialId));
    }

    revalidatePath("/defective");
    revalidatePath("/inventory");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to resolve defective item." };
  }
}
