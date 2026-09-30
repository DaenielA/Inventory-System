"use server";

import { db } from "@/db";
import { technicians } from "@/db/schema";
import { requireRole } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updateTechnicianAssignmentStatus } from "@/lib/inventory";

const technicianSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required").max(50),
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  team: z.string().trim().max(100).optional(),
});

export async function createTechnicianAction(formData: FormData) {
  await requireRole("WAREHOUSE_CUSTODIAN");

  const parsed = technicianSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    team: formData.get("team") || undefined,
  });

  if (!parsed.success) {
    redirect(`/technicians/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid technician details")}`);
  }

  const [existing] = await db
    .select({ id: technicians.id })
    .from(technicians)
    .where(eq(technicians.employeeId, parsed.data.employeeId))
    .limit(1);

  if (existing) {
    redirect(`/technicians/new?error=${encodeURIComponent("That employee ID is already registered.")}`);
  }

  const [technician] = await db
    .insert(technicians)
    .values({
      employeeId: parsed.data.employeeId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      team: parsed.data.team || null,
    })
    .returning({ id: technicians.id });

  revalidatePath("/technicians");
  redirect(`/technicians/${technician.id}`);
}

export async function updateTechnicianAssignmentStatusAction(
  assignmentId: string,
  status: "INSTALLED" | "CONSUMED" | "RETURNED",
) {
  const session = await requireRole("WAREHOUSE_CUSTODIAN");
  const parsed = z.enum(["INSTALLED", "CONSUMED", "RETURNED"]).safeParse(status);
  if (!parsed.success) return { error: "Invalid assignment status." };

  try {
    const result = await updateTechnicianAssignmentStatus({
      assignmentId,
      status: parsed.data,
      updatedById: session.user.id,
    });
    revalidatePath(`/technicians/${result.technicianId}`);
    revalidatePath("/technicians");
    revalidatePath("/inventory");
    revalidatePath("/search");
    revalidatePath("/dashboard");
    return { success: true, transactionNumber: result.transactionNumber };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update this assignment.",
    };
  }
}