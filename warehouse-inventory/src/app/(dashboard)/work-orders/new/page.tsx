import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { technicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WorkOrderForm } from "./work-order-form";

export default async function NewWorkOrderPage() {
  await requireRole("WAREHOUSE_CUSTODIAN");

  const technicianList = await db
    .select({ id: technicians.id, employeeId: technicians.employeeId, name: technicians.name })
    .from(technicians)
    .where(eq(technicians.isActive, true))
    .orderBy(technicians.name);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">New Work Order</h2>
        <p className="text-sm text-gray-500">Register a J.O. number to link materials to a job</p>
      </div>
      <WorkOrderForm technicians={technicianList} />
    </div>
  );
}
