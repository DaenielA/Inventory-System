import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { stockDeliveries, users, warehouses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Package, Plus } from "lucide-react";

export default async function DeliveriesPage() {
  await requireRole("WAREHOUSE_CUSTODIAN");

  const deliveries = await db
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
    })
    .from(stockDeliveries)
    .leftJoin(users, eq(stockDeliveries.receivedById, users.id))
    .leftJoin(warehouses, eq(stockDeliveries.warehouseId, warehouses.id))
    .orderBy(desc(stockDeliveries.deliveredAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">STO Deliveries</h2>
          <p className="text-sm text-gray-500">
            All IPG stock deliveries tracked by STO number
          </p>
        </div>
        <Link
          href="/receive"
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Receive Stock
        </Link>
      </div>

      {deliveries.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No deliveries recorded yet.</p>
          <Link
            href="/receive"
            className="mt-3 inline-block text-blue-600 text-sm hover:underline"
          >
            Record first delivery →
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    STO Number
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Delivered At
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Supplier
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Reference Doc
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Warehouse
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Received By
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Notes
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-blue-700">
                        {d.stoNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(d.deliveredAt).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.supplier ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {d.referenceDocument ?? (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.warehouseName ?? (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.receivedByName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                      {d.notes ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/deliveries/${d.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
