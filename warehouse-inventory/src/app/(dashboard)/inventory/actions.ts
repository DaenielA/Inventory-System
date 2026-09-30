"use server";

import { db } from "@/db";
import {
  inventoryAdjustments,
  inventoryTransactionItems,
  inventoryTransactions,
  materials,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { generateTransactionNumber } from "@/lib/transaction-numbers";
import { z } from "zod";

const schema = z.object({
  materialId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  adjustmentType: z.enum(["COUNT", "CORRECTION", "WRITE_OFF", "RECOVERY"]).default("CORRECTION"),
  quantityDelta: z.coerce.number().finite(),
  reason: z.string().min(1, "Reason is required"),
  adjustedAt: z.coerce.date(),
});

export async function adjustInventoryAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const parsed = schema.safeParse({
    materialId: formData.get("materialId"),
    warehouseId: formData.get("warehouseId") || undefined,
    adjustmentType: formData.get("adjustmentType") || "CORRECTION",
    quantityDelta: formData.get("quantityDelta"),
    reason: formData.get("reason"),
    adjustedAt: formData.get("adjustedAt") || new Date(),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid adjustment");
  }

  const { materialId, warehouseId, adjustmentType, quantityDelta, reason, adjustedAt } = parsed.data;

  const [material] = await db
    .select({ id: materials.id, name: materials.name })
    .from(materials)
    .where(eq(materials.id, materialId));

  if (!material) {
    throw new Error("Material not found");
  }

  const beforeRes = await db.execute(
    sql`SELECT COALESCE(SUM(quantity_delta::numeric), 0) as qty FROM inventory_transaction_items WHERE material_id = ${materialId}`
  );
  const beforeQty = Number((beforeRes as unknown as { qty: string }[])[0]?.qty ?? 0);
  const afterQty = beforeQty + quantityDelta;
  const dateStr = adjustedAt.toISOString().slice(0, 10).replace(/-/g, "");
  const countRes = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM inventory_transactions WHERE transaction_number LIKE ${`ADJ-${dateStr}-%`}`
  );
  const seq = Number((countRes as unknown as { cnt: string }[])[0]?.cnt ?? 0) + 1;
  const txNumber = generateTransactionNumber("ADJUST", seq, adjustedAt);

  await db.transaction(async (tx) => {
    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        transactionNumber: txNumber,
        type: "ADJUST",
        warehouseId: warehouseId ?? null,
        notes: reason,
        performedById: session.user.id,
        transactedAt: adjustedAt,
      })
      .returning();

    await tx.insert(inventoryTransactionItems).values({
      transactionId: transaction.id,
      materialId,
      quantity: String(afterQty),
      quantityDelta: String(quantityDelta),
      fromStatus: "AVAILABLE",
      toStatus: "AVAILABLE",
      notes: reason,
    });

    await tx.insert(inventoryAdjustments).values({
      transactionId: transaction.id,
      adjustmentNumber: txNumber,
      materialId,
      quantityBefore: String(beforeQty),
      quantityAfter: String(afterQty),
      adjustmentReason: reason,
      adjustmentType,
      approvedById: session.user.id,
      adjustedById: session.user.id,
      adjustedAt,
    });
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}
