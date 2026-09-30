"use server";

import { requireRole } from "@/lib/authorization";
import { returnMaterials } from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const returnSchema = z.object({
  technicianId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  workOrderId: z.string().optional(),
  reason: z.enum(["UNUSED", "DEFECTIVE", "WRONG_ITEM", "EXCESS", "JOB_CANCELLED", "OTHER"]),
  returnedAt: z.string().min(1, "Return date/time is required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        serialId: z.string().optional(),
        condition: z.enum(["GOOD", "DEFECTIVE"]),
        defectReason: z.string().optional(),
      })
    )
    .min(1, "Add at least one item"),
});

export async function returnMaterialsAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const raw = {
    technicianId: formData.get("technicianId"),
    warehouseId: formData.get("warehouseId"),
    workOrderId: formData.get("workOrderId") || undefined,
    reason: formData.get("reason"),
    returnedAt: formData.get("returnedAt"),
    notes: formData.get("notes") || undefined,
    items: JSON.parse((formData.get("items") as string) ?? "[]"),
  };

  const parsed = returnSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data } = parsed;

  try {
    const result = await returnMaterials({
      technicianId: data.technicianId,
      warehouseId: data.warehouseId,
      workOrderId: data.workOrderId,
      reason: data.reason,
      returnedAt: new Date(data.returnedAt),
      notes: data.notes,
      performedById: session.user.id,
      items: data.items,
    });

    revalidatePath("/inventory");
    revalidatePath("/technicians");
    revalidatePath("/dashboard");
    return { success: true, returnNumber: result.returnNumber };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record return.";
    return { error: msg };
  }
}
