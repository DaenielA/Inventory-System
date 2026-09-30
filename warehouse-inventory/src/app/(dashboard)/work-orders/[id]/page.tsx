import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import {
  workOrders,
  technicians,
  inventoryTransactions,
  inventoryTransactionItems,
  materials,
  materialSerials,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { WorkOrderStatusUpdater } from "./status-updater";

const STATUS_COLORS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  ON_HOLD: "default",
};

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("VIEWER");
  const { id } = await params;

  const [wo] = await db
    .select({
      id: workOrders.id,
      joNumber: workOrders.joNumber,
      type: workOrders.type,
      status: workOrders.status,
      customerReference: workOrders.customerReference,
      address: workOrders.address,
      scheduledDate: workOrders.scheduledDate,
      completedDate: workOrders.completedDate,
      remarks: workOrders.remarks,
      createdAt: workOrders.createdAt,
      updatedAt: workOrders.updatedAt,
      technicianName: technicians.name,
      technicianEmployeeId: technicians.employeeId,
    })
    .from(workOrders)
    .leftJoin(technicians, eq(workOrders.technicianId, technicians.id))
    .where(eq(workOrders.id, id));

  if (!wo) notFound();

  // Get all transactions linked to this work order
  const transactions = await db
    .select({
      id: inventoryTransactions.id,
      transactionNumber: inventoryTransactions.transactionNumber,
      type: inventoryTransactions.type,
      transactedAt: inventoryTransactions.transactedAt,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.workOrderId, id))
    .orderBy(inventoryTransactions.transactedAt);

  // Get all items across those transactions
  const txIds = transactions.map((t) => t.id);
  const items =
    txIds.length > 0
      ? await db
          .select({
            transactionId: inventoryTransactionItems.transactionId,
            quantity: inventoryTransactionItems.quantity,
            fromStatus: inventoryTransactionItems.fromStatus,
            toStatus: inventoryTransactionItems.toStatus,
            materialCode: materials.code,
            materialName: materials.name,
            materialUnit: materials.unit,
            serialNumber: materialSerials.serialNumber,
          })
          .from(inventoryTransactionItems)
          .leftJoin(materials, eq(inventoryTransactionItems.materialId, materials.id))
          .leftJoin(materialSerials, eq(inventoryTransactionItems.serialId, materialSerials.id))
          .where(inArray(inventoryTransactionItems.transactionId, txIds))
      : [];

  const itemsByTx = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.transactionId] ??= []).push(item);
    return acc;
  }, {});

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 font-mono">{wo.joNumber}</h2>
            <Badge variant={STATUS_COLORS[wo.status] ?? "default"}>{wo.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">{wo.type.replace("_", " ")} · Created {fmt(wo.createdAt)}</p>
        </div>
        <Link href="/work-orders" className="text-sm text-blue-600 hover:underline">← Back</Link>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Work Order Info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Technician</dt>
              <dd className="font-medium">{wo.technicianName ?? "—"} {wo.technicianEmployeeId ? `(${wo.technicianEmployeeId})` : ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Customer Ref</dt>
              <dd className="font-medium">{wo.customerReference ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-medium text-right max-w-[200px]">{wo.address ?? "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Timestamps</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Scheduled</dt>
              <dd className="font-medium">{fmt(wo.scheduledDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Completed</dt>
              <dd className="font-medium">{fmt(wo.completedDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="font-medium">{fmt(wo.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {wo.remarks && (
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">Remarks</p>
          <p className="text-sm text-gray-800">{wo.remarks}</p>
        </Card>
      )}

      {/* Status updater */}
      <WorkOrderStatusUpdater id={wo.id} currentStatus={wo.status} />

      {/* Transactions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Material Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400">No material transactions linked to this work order yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono text-sm font-semibold text-blue-700">{tx.transactionNumber}</span>
                    <span className="ml-2 text-xs text-gray-500">{tx.type}</span>
                  </div>
                  <span className="text-xs text-gray-400">{fmt(tx.transactedAt)}</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-1">Material</th>
                      <th className="text-left pb-1">Serial</th>
                      <th className="text-right pb-1">Qty</th>
                      <th className="text-left pb-1 pl-3">Status Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(itemsByTx[tx.id] ?? []).map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-1">[{item.materialCode}] {item.materialName}</td>
                        <td className="py-1 font-mono text-gray-600">{item.serialNumber ?? "—"}</td>
                        <td className="py-1 text-right">{item.quantity} {item.materialUnit}</td>
                        <td className="py-1 pl-3 text-gray-500">
                          {item.fromStatus ?? "—"} → {item.toStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
