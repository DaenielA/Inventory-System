import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials, technicians, warehouses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ReturnForm } from "./return-form";

export default async function ReturnsPage() {
  await requireRole("WAREHOUSE_CUSTODIAN");

  const [materialList, technicianList, warehouseList] = await Promise.all([
    db
      .select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
      .from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(materials.name),
    db
      .select({ id: technicians.id, employeeId: technicians.employeeId, name: technicians.name })
      .from(technicians)
      .where(eq(technicians.isActive, true))
      .orderBy(technicians.name),
    db
      .select({ id: warehouses.id, code: warehouses.code, name: warehouses.name })
      .from(warehouses)
      .where(eq(warehouses.isActive, true)),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Return Materials</h2>
        <p className="text-sm text-gray-500">Record materials returned by a technician to the warehouse</p>
      </div>
      <ReturnForm materials={materialList} technicians={technicianList} warehouses={warehouseList} />
    </div>
  );
}
