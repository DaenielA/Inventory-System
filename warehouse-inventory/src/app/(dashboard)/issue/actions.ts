"use server";

import { requireRole } from "@/lib/authorization";
import { issueMaterials } from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const issueSchema = z.object({
  technicianId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  workOrderId: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialId: z.string().uuid(),
    quantity: z.coerce.number().positive(),
    serialNumber: z.string().trim().max(100).optional(),
    serialId: z.string().optional(),
    batchNumber: z.string().optional(),
  })).min(1, "Add at least one item"),
});

export async function issueMaterialsAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const raw = {
    technicianId: formData.get("technicianId"),
    warehouseId: formData.get("warehouseId") || undefined,
    workOrderId: formData.get("workOrderId") || undefined,
    purpose: formData.get("purpose") || undefined,
    notes: formData.get("notes") || undefined,
    items: JSON.parse(formData.get("items") as string ?? "[]"),
  };

  const parsed = issueSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data } = parsed;

  try {
    const tx = await issueMaterials({
      technicianId: data.technicianId,
      warehouseId: data.warehouseId,
      workOrderId: data.workOrderId,
      purpose: data.purpose,
      notes: data.notes,
      performedById: session.user.id,
      items: data.items,
    });

    revalidatePath("/inventory");
    revalidatePath("/technicians");
    revalidatePath("/dashboard");
    return {
      success: true,
      transactionNumber: tx.transactionNumber,
      openingTransactionNumber: tx.openingTransactionNumber,
    };
  } catch (e) {
    if (e instanceof Error && (
      e.message.startsWith("Insufficient stock")
      || e.message.startsWith("Enter a serial number")
      || e.message.startsWith("Serial number ")
      || e.message.includes(" is serialized; issue one serial number per line.")
      || e.message.includes(" is not configured for serial tracking.")
    )) {
      return { error: e.message };
    }
    return { error: "Failed to record issuance. Please try again." };
  }
}
