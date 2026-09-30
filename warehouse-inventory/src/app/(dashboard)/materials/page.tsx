import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials, materialCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function MaterialsPage() {
  await requireRole("ADMIN");

  const rows = await db
    .select({
      id: materials.id,
      code: materials.code,
      name: materials.name,
      unit: materials.unit,
      brand: materials.brand,
      requiresSerial: materials.requiresSerial,
      minStock: materials.minStock,
      reorderLevel: materials.reorderLevel,
      isActive: materials.isActive,
      categoryName: materialCategories.name,
    })
    .from(materials)
    .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
    .orderBy(materials.code);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Materials</h2>
          <p className="text-sm text-gray-500">{rows.length} materials in master list</p>
        </div>
        <Link
          href="/materials/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Material
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Serial</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Min Stock</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{m.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{m.unit}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {m.requiresSerial ? (
                      <Badge variant="info">Required</Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{m.minStock}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.isActive ? "success" : "gray"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/materials/${m.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              No materials yet. Add your first material.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
