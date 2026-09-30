"use server";

import { db } from "@/db";
import { technicians, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/authorization";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "WAREHOUSE_CUSTODIAN"]),
  technicianId: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
});

export async function createUserAction(formData: FormData) {
  await requireRole("ADMIN");

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    technicianId: formData.get("technicianId") || undefined,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/users?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid user data")}`);
  }

  const exists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (exists.length) {
    redirect(`/users?error=${encodeURIComponent("Email already exists")}`);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role,
    technicianId: parsed.data.technicianId || null,
    isActive: parsed.data.isActive,
  });

  revalidatePath("/users");
  redirect("/users");
}

const updateUserSchema = userSchema.partial().extend({
  id: z.string().uuid(),
});

async function getAdminAccessError(
  userId: string,
  actorId: string,
  nextRole?: "ADMIN" | "WAREHOUSE_CUSTODIAN",
  nextIsActive?: boolean,
) {
  const [target] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) return "User not found.";

  const remainsActiveAdmin =
    (nextRole ?? target.role) === "ADMIN" && (nextIsActive ?? target.isActive);
  if (target.role !== "ADMIN" || !target.isActive || remainsActiveAdmin) return null;
  if (target.id === actorId) return "You cannot remove your own active admin access.";

  const activeAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "ADMIN"), eq(users.isActive, true)));

  if (activeAdmins.length <= 1) return "At least one active admin account must remain.";
  return null;
}

export async function updateUserAction(id: string, formData: FormData) {
  const session = await requireRole("ADMIN");

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    role: formData.get("role"),
    technicianId: formData.get("technicianId") || undefined,
    isActive: formData.get("isActive") === "true",
    id,
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/users/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid user data")}`);
  }

  const accessError = await getAdminAccessError(
    id,
    session.user.id,
    parsed.data.role,
    parsed.data.isActive,
  );
  if (accessError) redirect(`/users/${id}?error=${encodeURIComponent(accessError)}`);

  const payload: {
    name?: string;
    email?: string;
    passwordHash?: string;
    role?: "ADMIN" | "WAREHOUSE_CUSTODIAN";
    technicianId?: string | null;
    isActive?: boolean;
    updatedAt: Date;
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    technicianId: parsed.data.technicianId || null,
    isActive: parsed.data.isActive,
    updatedAt: new Date(),
  };

  if (parsed.data.password) {
    payload.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  await db.update(users).set(payload).where(eq(users.id, id));
  revalidatePath("/users");
  redirect("/users");
}

export async function toggleUserActiveAction(id: string, isActive: boolean) {
  const session = await requireRole("ADMIN");
  const accessError = await getAdminAccessError(id, session.user.id, undefined, isActive);
  if (accessError) redirect(`/users/${id}?error=${encodeURIComponent(accessError)}`);

  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id));
  revalidatePath("/users");
}
