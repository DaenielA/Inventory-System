"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { workOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  joNumber: z.string().min(1, "J.O. number is required"),
  technicianId: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["INSTALLATION", "REPAIR", "PULLOUT", "UPGRADE", "OTHER"]),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]),
  customerReference: z.string().optional(),
  address: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  remarks: z.string().optional(),
});

export async function createWorkOrderAction(formData: FormData) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");

  const raw = {
    joNumber: formData.get("joNumber"),
    technicianId: formData.get("technicianId") || undefined,
    type: formData.get("type"),
    status: formData.get("status"),
    customerReference: formData.get("customerReference") || undefined,
    address: formData.get("address") || undefined,
    scheduledDate: formData.get("scheduledDate") || undefined,
    completedDate: formData.get("completedDate") || undefined,
    remarks: formData.get("remarks") || undefined,
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data } = parsed;

  try {
    const [wo] = await db
      .insert(workOrders)
      .values({
        joNumber: data.joNumber.toUpperCase(),
        technicianId: data.technicianId || null,
        type: data.type,
        status: data.status,
        customerReference: data.customerReference,
        address: data.address,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
        remarks: data.remarks,
        createdById: session.user.id,
      })
      .returning();

    revalidatePath("/work-orders");
    return { success: true, id: wo.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create work order.";
    if (msg.includes("unique")) return { error: "J.O. number already exists." };
    return { error: msg };
  }
}

export async function updateWorkOrderStatusAction(
  id: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD",
  completedDate?: string
) {
  await requireRole("WAREHOUSE_CUSTODIAN");

  await db
    .update(workOrders)
    .set({
      status,
      completedDate: completedDate ? new Date(completedDate) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(workOrders.id, id));

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  return { success: true };
}
