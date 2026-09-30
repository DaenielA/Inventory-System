"use server";

import { requireRole } from "@/lib/authorization";
import { consumeInstallMaterials } from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const installSchema = z.object({
  technicianId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  workOrderId: z.string().optional(),
  consumedAt: z.string().min(1, "Date/time is required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        serialId: z.string().optional(),
        action: z.enum(["INSTALL", "CONSUME"]),
      })
    )
    .min(1, "Add at least one item"),
});

export async function installMaterialsAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const raw = {
    technicianId: formData.get("technicianId"),
    warehouseId: formData.get("warehouseId"),
    workOrderId: formData.get("workOrderId") || undefined,
    consumedAt: formData.get("consumedAt"),
    notes: formData.get("notes") || undefined,
    items: JSON.parse((formData.get("items") as string) ?? "[]"),
  };

  const parsed = installSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data } = parsed;

  try {
    const tx = await consumeInstallMaterials({
      technicianId: data.technicianId,
      warehouseId: data.warehouseId,
      workOrderId: data.workOrderId,
      consumedAt: new Date(data.consumedAt),
      notes: data.notes,
      performedById: session.user.id,
      items: data.items,
    });

    revalidatePath("/inventory");
    revalidatePath("/technicians");
    revalidatePath("/dashboard");
    return { success: true, transactionNumber: tx.transactionNumber };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record installation.";
    return { error: msg };
  }
}
