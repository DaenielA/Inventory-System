"use server";

import { requireRole } from "@/lib/authorization";
import { receiveStock } from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const receiveSchema = z.object({
  warehouseId: z.string().uuid(),
  stoNumber: z.string().min(1, "STO number is required"),
  deliveredAt: z.string().min(1, "Delivery date is required"),
  supplier: z.string().optional(),
  referenceDocument: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        batchNumber: z.string().optional(),
        serialNumbers: z.string().optional(),
      })
    )
    .min(1, "Add at least one item"),
});

export async function receiveStockAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const raw = {
    warehouseId: formData.get("warehouseId"),
    stoNumber: formData.get("stoNumber"),
    deliveredAt: formData.get("deliveredAt"),
    supplier: formData.get("supplier") || undefined,
    referenceDocument: formData.get("referenceDocument") || undefined,
    notes: formData.get("notes") || undefined,
    items: JSON.parse((formData.get("items") as string) ?? "[]"),
  };

  const parsed = receiveSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data } = parsed;

  try {
    const tx = await receiveStock({
      warehouseId: data.warehouseId,
      performedById: session.user.id,
      stoNumber: data.stoNumber,
      deliveredAt: new Date(data.deliveredAt),
      supplier: data.supplier,
      referenceDocument: data.referenceDocument,
      notes: data.notes,
      items: data.items.map((item) => ({
        materialId: item.materialId,
        quantity: item.quantity,
        batchNumber: item.batchNumber,
        serialNumbers: item.serialNumbers
          ? item.serialNumbers
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      })),
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/deliveries");
    return { success: true, transactionNumber: tx.transactionNumber };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record receiving.";
    return { error: msg };
  }
}
