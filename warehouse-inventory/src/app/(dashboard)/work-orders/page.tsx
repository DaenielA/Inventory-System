import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { workOrders, technicians } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  ON_HOLD: "default",
};

export default async function WorkOrdersPage() {
  await requireRole("VIEWER");

  const rows = await db
    .select({
      id: workOrders.id,
      joNumber: workOrders.joNumber,
      type: workOrders.type,
      status: workOrders.status,
      customerReference: workOrders.customerReference,
      scheduledDate: workOrders.scheduledDate,
      completedDate: workOrders.completedDate,
      createdAt: workOrders.createdAt,
      technicianName: technicians.name,
    })
    .from(workOrders)
    .leftJoin(technicians, eq(workOrders.technicianId, technicians.id))
    .orderBy(desc(workOrders.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Work Orders</h2>
          <p className="text-sm text-gray-500">Track J.O. numbers and material assignments</p>
        </div>
        <Link href="/work-orders/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New Work Order
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No work orders yet. Create one to start tracking materials.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">J.O. Number</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Technician</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Completed</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">{wo.joNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{wo.type.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-gray-700">{wo.technicianName ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[wo.status] ?? "default"}>
                        {wo.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {wo.scheduledDate
                        ? new Date(wo.scheduledDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {wo.completedDate
                        ? new Date(wo.completedDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(wo.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
