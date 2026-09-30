"use server";

import { db } from "@/db";
import { inventoryTransactionItems, inventoryTransactions, materialSerials, pullouts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { generateTransactionNumber } from "@/lib/transaction-numbers";

const pulloutSchema = z.object({
  materialId: z.string().uuid(),
  serialId: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  reason: z.enum(["DEFECTIVE", "VENDOR_RETURN", "REPLACEMENT", "TRANSFER", "INVESTIGATION", "REPAIR", "DISPOSAL", "OTHER"]),
  destination: z.string().min(1, "Destination is required"),
  pulledOutAt: z.string().min(1, "Date/time is required"),
  notes: z.string().optional(),
  quantity: z.coerce.number().min(1).default(1),
});

export async function logPulloutAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const parsed = pulloutSchema.safeParse({
    materialId: formData.get("materialId"),
    serialId: formData.get("serialId") || undefined,
    technicianId: formData.get("technicianId") || undefined,
    warehouseId: formData.get("warehouseId") || undefined,
    reason: formData.get("reason"),
    destination: formData.get("destination"),
    pulledOutAt: formData.get("pulledOutAt"),
    notes: formData.get("notes") || undefined,
    quantity: formData.get("quantity") || 1,
  });

  if (!parsed.success) {
    redirect(`/pullouts?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid pull-out")}`);
  }

  const data = parsed.data;
  const pulledOutAt = new Date(data.pulledOutAt);
  const dateStr = pulledOutAt.toISOString().slice(0, 10).replace(/-/g, "");

  const countRes = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM inventory_transactions WHERE transaction_number LIKE ${`PUL-${dateStr}-%`}`
  );
  const seq = Number((countRes as unknown as { cnt: string }[])[0]?.cnt ?? 0) + 1;
  const txNumber = generateTransactionNumber("PULLOUT", seq, pulledOutAt);

  try {
    await db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(inventoryTransactions)
        .values({
          transactionNumber: txNumber,
          type: "PULLOUT",
          warehouseId: data.warehouseId ?? null,
          technicianId: data.technicianId ?? null,
          notes: data.notes ?? `Pull-out: ${data.destination}`,
          performedById: session.user.id,
          transactedAt: pulledOutAt,
        })
        .returning();

      await tx.insert(inventoryTransactionItems).values({
        transactionId: transaction.id,
        materialId: data.materialId,
        serialId: data.serialId ?? null,
        quantity: String(data.quantity),
        quantityDelta: String(-data.quantity),
        fromStatus: "WITH_TECHNICIAN",
        toStatus: "TRANSFERRED",
        notes: `${data.reason}: ${data.destination}`,
      });

      await tx.insert(pullouts).values({
        transactionId: transaction.id,
        pulloutNumber: txNumber,
        reason: data.reason,
        destination: data.destination,
        responsiblePersonId: session.user.id,
        approvedById: session.user.id,
        pulledOutAt,
        notes: data.notes ?? null,
      });

      if (data.serialId) {
        await tx
          .update(materialSerials)
          .set({ status: "TRANSFERRED", updatedAt: pulledOutAt })
          .where(eq(materialSerials.id, data.serialId));
      }
    });

    revalidatePath("/pullouts");
    revalidatePath("/inventory");
    redirect("/pullouts?success=1");
  } catch (error) {
    redirect(`/pullouts?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to log pull-out")}`);
  }
}
