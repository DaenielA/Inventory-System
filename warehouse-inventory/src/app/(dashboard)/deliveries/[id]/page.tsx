import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import {
  stockDeliveries,
  inventoryTransactions,
  inventoryTransactionItems,
  materialSerials,
  materials,
  users,
  warehouses,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package } from "lucide-react";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("WAREHOUSE_CUSTODIAN");
  const { id } = await params;

  const [delivery] = await db
    .select({
      id: stockDeliveries.id,
      stoNumber: stockDeliveries.stoNumber,
      deliveredAt: stockDeliveries.deliveredAt,
      supplier: stockDeliveries.supplier,
      referenceDocument: stockDeliveries.referenceDocument,
      notes: stockDeliveries.notes,
      createdAt: stockDeliveries.createdAt,
      receivedByName: users.name,
      warehouseName: warehouses.name,
      transactionNumber: inventoryTransactions.transactionNumber,
      transactionId: inventoryTransactions.id,
    })
    .from(stockDeliveries)
    .leftJoin(users, eq(stockDeliveries.receivedById, users.id))
    .leftJoin(warehouses, eq(stockDeliveries.warehouseId, warehouses.id))
    .leftJoin(
      inventoryTransactions,
      eq(stockDeliveries.transactionId, inventoryTransactions.id)
    )
    .where(eq(stockDeliveries.id, id));

  if (!delivery) notFound();

  // Get all transaction items for this delivery
  const txItems = await db
    .select({
      id: inventoryTransactionItems.id,
      quantity: inventoryTransactionItems.quantity,
      batchNumber: inventoryTransactionItems.batchNumber,
      materialId: materials.id,
      materialCode: materials.code,
      materialName: materials.name,
      materialUnit: materials.unit,
    })
    .from(inventoryTransactionItems)
    .leftJoin(materials, eq(inventoryTransactionItems.materialId, materials.id))
    .where(eq(inventoryTransactionItems.transactionId, delivery.transactionId!));

  // Get all serial numbers received under this STO
  const serials = await db
    .select({
      id: materialSerials.id,
      serialNumber: materialSerials.serialNumber,
      status: materialSerials.status,
      materialCode: materials.code,
      materialName: materials.name,
    })
    .from(materialSerials)
    .leftJoin(materials, eq(materialSerials.materialId, materials.id))
    .where(eq(materialSerials.stoNumber, delivery.stoNumber))
    .orderBy(materials.name, materialSerials.serialNumber);

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    WITH_TECHNICIAN: "bg-blue-100 text-blue-800",
    INSTALLED: "bg-purple-100 text-purple-800",
    CONSUMED: "bg-purple-100 text-purple-800",
    RETURNED_GOOD: "bg-teal-100 text-teal-800",
    RETURNED_DEFECTIVE: "bg-red-100 text-red-800",
    FOR_INSPECTION: "bg-yellow-100 text-yellow-800",
    DEFECTIVE: "bg-red-100 text-red-800",
    SCRAPPED: "bg-gray-100 text-gray-600",
    LOST: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/deliveries"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-mono">
            {delivery.stoNumber}
          </h2>
          <p className="text-sm text-gray-500">STO Delivery Detail</p>
        </div>
      </div>

      {/* Delivery Info */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Delivery Info</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">STO Number</p>
            <p className="font-mono font-semibold text-blue-700">
              {delivery.stoNumber}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Delivered At</p>
            <p className="font-medium">
              {new Date(delivery.deliveredAt).toLocaleString("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Supplier</p>
            <p className="font-medium">{delivery.supplier ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Reference Document</p>
            <p className="font-mono text-xs">{delivery.referenceDocument ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Warehouse</p>
            <p className="font-medium">{delivery.warehouseName ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Received By</p>
            <p className="font-medium">{delivery.receivedByName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Transaction #</p>
            <p className="font-mono text-xs text-gray-700">
              {delivery.transactionNumber}
            </p>
          </div>
          {delivery.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-gray-500 text-xs">Notes</p>
              <p className="text-gray-700">{delivery.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Materials Received */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Materials Received</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">
                Material
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">
                Code
              </th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">
                Qty
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">
                Unit
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">
                Batch
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {txItems.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 font-medium">{item.materialName}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">
                  {item.materialCode}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {Number(item.quantity)}
                </td>
                <td className="px-4 py-2 text-gray-500">{item.materialUnit}</td>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                  {item.batchNumber ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Serial Numbers */}
      {serials.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Serial Numbers ({serials.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">
                  Serial Number
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">
                  Material
                </th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">
                  Current Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {serials.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-semibold text-gray-800">
                    {s.serialNumber}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    <span className="text-xs text-gray-400 mr-1">
                      [{s.materialCode}]
                    </span>
                    {s.materialName}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        statusColors[s.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
