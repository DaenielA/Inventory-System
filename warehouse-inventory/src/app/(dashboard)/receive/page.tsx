import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials, warehouses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ReceiveForm } from "./receive-form";

export default async function ReceivePage() {
  await requireRole("WAREHOUSE_CUSTODIAN");

  const [materialList, warehouseList] = await Promise.all([
    db.select({
      id: materials.id,
      code: materials.code,
      name: materials.name,
      unit: materials.unit,
      requiresSerial: materials.requiresSerial,
      requiresBatch: materials.requiresBatch,
    }).from(materials).where(eq(materials.isActive, true)).orderBy(materials.name),
    db.select({ id: warehouses.id, code: warehouses.code, name: warehouses.name })
      .from(warehouses).where(eq(warehouses.isActive, true)),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Receive Stock</h2>
        <p className="text-sm text-gray-500">Record incoming materials into the warehouse</p>
      </div>
      <ReceiveForm materials={materialList} warehouses={warehouseList} />
    </div>
  );
}
