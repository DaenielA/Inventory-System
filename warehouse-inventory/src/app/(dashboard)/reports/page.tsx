import { requireAuth } from "@/lib/authorization";
import { db } from "@/db";
import { inventoryTransactions, inventoryTransactionItems, materials, technicians } from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { Card } from "@/components/ui/card";

export default async function ReportsPage() {
  await requireAuth();

  const [txSummary, lowStock, recent] = await Promise.all([
    db
      .select({
        type: inventoryTransactions.type,
        total: count(),
      })
      .from(inventoryTransactions)
      .groupBy(inventoryTransactions.type)
      .orderBy(sql`${inventoryTransactions.type} asc`),
    db
      .select({
        id: materials.id,
        code: materials.code,
        name: materials.name,
        minStock: materials.minStock,
        available: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryTransactionItems.toStatus} IN ('AVAILABLE', 'RETURNED_GOOD') OR ${inventoryTransactionItems.fromStatus} = 'AVAILABLE' THEN ${inventoryTransactionItems.quantityDelta}::numeric ELSE 0 END), 0)`,
      })
      .from(materials)
      .leftJoin(inventoryTransactionItems, eq(materials.id, inventoryTransactionItems.materialId))
      .where(eq(materials.isActive, true))
      .groupBy(materials.id, materials.code, materials.name, materials.minStock)
      .having(sql`COALESCE(SUM(CASE WHEN ${inventoryTransactionItems.toStatus} IN ('AVAILABLE', 'RETURNED_GOOD') OR ${inventoryTransactionItems.fromStatus} = 'AVAILABLE' THEN ${inventoryTransactionItems.quantityDelta}::numeric ELSE 0 END), 0) <= ${materials.minStock}`),
    db
      .select({
        transactionNumber: inventoryTransactions.transactionNumber,
        type: inventoryTransactions.type,
        transactedAt: inventoryTransactions.transactedAt,
        technicianName: technicians.name,
      })
      .from(inventoryTransactions)
      .leftJoin(technicians, eq(inventoryTransactions.technicianId, technicians.id))
      .orderBy(sql`${inventoryTransactions.transactedAt} desc`)
      .limit(8),
  ]);

  const totals = {
    receive: txSummary.find((x) => x.type === "RECEIVE")?.total ?? 0,
    issue: txSummary.find((x) => x.type === "ISSUE")?.total ?? 0,
    return: txSummary.find((x) => x.type === "RETURN")?.total ?? 0,
    install: txSummary.find((x) => x.type === "INSTALL")?.total ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500">Quick operational overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Received</p>
          <p className="text-2xl font-bold mt-1">{totals.receive.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Issued</p>
          <p className="text-2xl font-bold mt-1">{totals.issue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Returns</p>
          <p className="text-2xl font-bold mt-1">{totals.return.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Installed</p>
          <p className="text-2xl font-bold mt-1">{totals.install.toLocaleString()}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Low stock alert</h3>
          <div className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-400">No low-stock materials.</p>
            ) : (
              lowStock.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span>{m.name}</span>
                  <span className="font-medium text-red-600">{Number(m.available ?? 0)} / min {m.minStock}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Recent activity</h3>
          <div className="space-y-2">
            {recent.map((row) => (
              <div key={row.transactionNumber} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{row.transactionNumber}</p>
                  <p className="text-xs text-gray-500">{row.technicianName ?? "Warehouse"}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-700">{row.type}</p>
                  <p className="text-xs text-gray-500">{row.transactedAt ? new Date(row.transactedAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
