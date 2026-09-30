import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials, technicians, warehouses, workOrders } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { InstallForm } from "./install-form";

export default async function InstallPage() {
  await requireRole("WAREHOUSE_CUSTODIAN");

  const [materialList, technicianList, warehouseList, workOrderList] = await Promise.all([
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
    db
      .select({ id: workOrders.id, joNumber: workOrders.joNumber })
      .from(workOrders)
      .where(inArray(workOrders.status, ["PENDING", "IN_PROGRESS"]))
      .orderBy(workOrders.joNumber),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Record Installation / Consumption</h2>
        <p className="text-sm text-gray-500">Mark materials as installed on a work order or consumed during a job</p>
      </div>
      <InstallForm
        materials={materialList}
        technicians={technicianList}
        warehouses={warehouseList}
        workOrders={workOrderList}
      />
    </div>
  );
}
