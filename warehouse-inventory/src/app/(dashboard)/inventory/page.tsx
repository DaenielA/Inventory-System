import { requireAuth } from "@/lib/authorization";
import { db } from "@/db";
import { materials, materialCategories, inventoryTransactionItems, warehouses } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { adjustInventoryAction } from "./actions";

async function getInventoryBalance() {
  // Derive current available quantity per material from transaction ledger
  const balances = await db
    .select({
      materialId: inventoryTransactionItems.materialId,
      status: inventoryTransactionItems.toStatus,
      total: sql<number>`sum(${inventoryTransactionItems.quantityDelta}::numeric)`,
    })
    .from(inventoryTransactionItems)
    .groupBy(inventoryTransactionItems.materialId, inventoryTransactionItems.toStatus);

  // Group by material
  const byMaterial: Record<string, Record<string, number>> = {};
  for (const row of balances) {
    if (!byMaterial[row.materialId]) byMaterial[row.materialId] = {};
    byMaterial[row.materialId][row.status] = Number(row.total);
  }

  return byMaterial;
}

export default async function InventoryPage() {
  await requireAuth();

  const [materialList, balances, warehouseList] = await Promise.all([
    db
      .select({
        id: materials.id,
        code: materials.code,
        name: materials.name,
        unit: materials.unit,
        minStock: materials.minStock,
        reorderLevel: materials.reorderLevel,
        isActive: materials.isActive,
        categoryName: materialCategories.name,
      })
      .from(materials)
      .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
      .where(eq(materials.isActive, true))
      .orderBy(materials.code),
    getInventoryBalance(),
    db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses).where(eq(warehouses.isActive, true)).orderBy(warehouses.name),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500">Current stock levels derived from transaction history</p>
        </div>
        <Link
          href="/receive"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          + Receive Stock
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Quick reconciliation</h3>
            <p className="text-xs text-gray-500">Log a count or adjustment with a timestamp.</p>
          </div>
        </div>

        <form action={adjustInventoryAction} className="grid gap-3 md:grid-cols-6">
          <select name="materialId" required defaultValue="" className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select material</option>
            {materialList.map((m) => (
              <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
            ))}
          </select>

          <select name="warehouseId" required defaultValue={warehouseList[0]?.id ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {warehouseList.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <select name="adjustmentType" defaultValue="CORRECTION" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="COUNT">Count</option>
            <option value="CORRECTION">Correction</option>
            <option value="WRITE_OFF">Write-off</option>
            <option value="RECOVERY">Recovery</option>
          </select>

          <input name="quantityDelta" type="number" step="1" defaultValue={0} required className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Qty" />

          <input name="adjustedAt" type="datetime-local" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <input name="reason" placeholder="Reason" required className="md:col-span-6 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <div className="md:col-span-6 flex justify-end">
            <button type="submit" className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Save reconciliation
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Material</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Available</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">With Tech</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Defective</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stock Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {materialList.map((m) => {
                const mb = balances[m.id] ?? {};
                const available = Math.max(0, mb["AVAILABLE"] ?? 0);
                const withTech = Math.max(0, mb["WITH_TECHNICIAN"] ?? 0);
                const defective = Math.max(0, mb["DEFECTIVE"] ?? 0);

                let stockLevel: { label: string; variant: "danger" | "warning" | "success" } = {
                  label: "OK",
                  variant: "success",
                };
                if (available === 0) {
                  stockLevel = { label: "Out of Stock", variant: "danger" };
                } else if (available <= m.minStock) {
                  stockLevel = { label: "Critical", variant: "danger" };
                } else if (available <= m.reorderLevel) {
                  stockLevel = { label: "Low Stock", variant: "warning" };
                }

                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{m.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{m.categoryName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {available.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell">
                      {withTech.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {defective > 0 ? (
                        <span className="text-red-600 font-medium">{defective}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{m.unit}</td>
                    <td className="px-4 py-3">
                      <Badge variant={stockLevel.variant}>{stockLevel.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {materialList.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              No materials found. Add materials in the Materials section.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
