"use server";

import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const materialSchema = z.object({
  code:           z.string().min(1, "Matcode is required").max(50),
  name:           z.string().min(1, "Name is required").max(100),
  description:    z.string().optional(),
  categoryId:     z.string().uuid("Select a category"),
  unit:           z.enum(["PCS", "METERS", "ROLLS", "BOXES", "SETS", "PAIRS", "LITERS", "KG"]),
  brand:          z.string().optional(),
  model:          z.string().optional(),
  requiresSerial: z.coerce.boolean(),
  minStock:       z.coerce.number().int().min(0).default(0),
  reorderLevel:   z.coerce.number().int().min(0).default(0),
  maxStock:       z.coerce.number().int().min(0).optional(),
});

export async function createMaterialAction(formData: FormData) {
  await requireRole("ADMIN");

  const raw = {
    code:           formData.get("code"),
    name:           formData.get("name"),
    description:    formData.get("description") || undefined,
    categoryId:     formData.get("categoryId"),
    unit:           formData.get("unit"),
    brand:          formData.get("brand") || undefined,
    model:          formData.get("model") || undefined,
    requiresSerial: formData.get("requiresSerial") === "true",
    minStock:       formData.get("minStock"),
    reorderLevel:   formData.get("reorderLevel"),
    maxStock:       formData.get("maxStock") || undefined,
  };

  const parsed = materialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.select({ id: materials.id }).from(materials)
    .where(eq(materials.code, parsed.data.code)).limit(1);
  if (existing.length) return { error: `Matcode "${parsed.data.code}" already exists.` };

  await db.insert(materials).values({
    ...parsed.data,
    maxStock: parsed.data.maxStock ?? null,
  });

  revalidatePath("/materials");
  redirect("/materials");
}

export async function updateMaterialAction(id: string, formData: FormData) {
  await requireRole("ADMIN");

  const raw = {
    code:           formData.get("code"),
    name:           formData.get("name"),
    description:    formData.get("description") || undefined,
    categoryId:     formData.get("categoryId"),
    unit:           formData.get("unit"),
    brand:          formData.get("brand") || undefined,
    model:          formData.get("model") || undefined,
    requiresSerial: formData.get("requiresSerial") === "true",
    minStock:       formData.get("minStock"),
    reorderLevel:   formData.get("reorderLevel"),
    maxStock:       formData.get("maxStock") || undefined,
  };

  const parsed = materialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Check code uniqueness excluding self
  const existing = await db.select({ id: materials.id }).from(materials)
    .where(eq(materials.code, parsed.data.code)).limit(1);
  if (existing.length && existing[0].id !== id) {
    return { error: `Matcode "${parsed.data.code}" is already used by another material.` };
  }

  await db.update(materials).set({
    ...parsed.data,
    maxStock: parsed.data.maxStock ?? null,
    updatedAt: new Date(),
  }).where(eq(materials.id, id));

  revalidatePath("/materials");
  redirect("/materials");
}

export async function toggleMaterialActiveAction(id: string, isActive: boolean) {
  await requireRole("ADMIN");
  await db.update(materials).set({ isActive, updatedAt: new Date() }).where(eq(materials.id, id));
  revalidatePath("/materials");
}
