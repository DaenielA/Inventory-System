import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials, materialCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MaterialForm } from "../material-form";
import { toggleMaterialActiveAction } from "../actions";
import { Badge } from "@/components/ui/badge";

export default async function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;

  const [[mat], categories] = await Promise.all([
    db.select().from(materials).where(eq(materials.id, id)).limit(1),
    db.select({ id: materialCategories.id, code: materialCategories.code, name: materialCategories.name })
      .from(materialCategories)
      .where(eq(materialCategories.isActive, true))
      .orderBy(materialCategories.name),
  ]);

  if (!mat) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-2xl mx-auto">
        <Badge variant={mat.isActive ? "success" : "gray"}>
          {mat.isActive ? "Active" : "Inactive"}
        </Badge>
        <form action={async () => {
          "use server";
          await toggleMaterialActiveAction(id, !mat.isActive);
        }}>
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {mat.isActive ? "Deactivate" : "Reactivate"} this material
          </button>
        </form>
      </div>

      <MaterialForm
        categories={categories}
        initial={{
          id: mat.id,
          code: mat.code,
          name: mat.name,
          description: mat.description,
          categoryId: mat.categoryId,
          unit: mat.unit,
          brand: mat.brand,
          model: mat.model,
          requiresSerial: mat.requiresSerial,
          minStock: mat.minStock,
          reorderLevel: mat.reorderLevel,
          maxStock: mat.maxStock ?? null,
        }}
      />
    </div>
  );
}
