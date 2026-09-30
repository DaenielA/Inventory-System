import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials, technicians, warehouses, inventoryTransactionItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { IssueForm } from "./issue-form";

export default async function IssuePage() {
  await requireRole("WAREHOUSE_CUSTODIAN");

  // Get available qty per material from ledger
  const balances = await db
    .select({
      materialId: inventoryTransactionItems.materialId,
      available: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryTransactionItems.toStatus} IN ('AVAILABLE', 'RETURNED_GOOD') OR ${inventoryTransactionItems.fromStatus} = 'AVAILABLE' THEN ${inventoryTransactionItems.quantityDelta}::numeric ELSE 0 END), 0)`,
    })
    .from(inventoryTransactionItems)
    .groupBy(inventoryTransactionItems.materialId);

  const availableMap = Object.fromEntries(balances.map((b) => [b.materialId, Math.max(0, Number(b.available))]));

  const [materialList, technicianList, warehouseList] = await Promise.all([
    db.select({
      id: materials.id,
      code: materials.code,
      name: materials.name,
      unit: materials.unit,
      requiresSerial: materials.requiresSerial,
    }).from(materials).where(eq(materials.isActive, true)).orderBy(materials.name),
    db.select({
      id: technicians.id,
      employeeId: technicians.employeeId,
      name: technicians.name,
      team: technicians.team,
    }).from(technicians).where(eq(technicians.isActive, true)).orderBy(technicians.name),
    db.select({ id: warehouses.id, code: warehouses.code, name: warehouses.name })
      .from(warehouses).where(eq(warehouses.isActive, true)),
  ]);

  const materialsWithStock = materialList.map((m) => ({
    ...m,
    available: availableMap[m.id] ?? 0,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Issue Materials</h2>
        <p className="text-sm text-gray-500">Issue materials from warehouse to a technician</p>
      </div>
      <IssueForm
        materials={materialsWithStock}
        technicians={technicianList}
        warehouses={warehouseList}
      />
    </div>
  );
}
