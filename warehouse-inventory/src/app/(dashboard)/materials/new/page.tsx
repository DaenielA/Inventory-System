import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materialCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MaterialForm } from "../material-form";

export default async function NewMaterialPage() {
  await requireRole("ADMIN");

  const categories = await db
    .select({ id: materialCategories.id, code: materialCategories.code, name: materialCategories.name })
    .from(materialCategories)
    .where(eq(materialCategories.isActive, true))
    .orderBy(materialCategories.name);

  return <MaterialForm categories={categories} />;
}
