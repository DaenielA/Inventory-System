import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { defectiveItems, materials, technicians, materialSerials, warehouses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { DefectiveActions } from "./defective-actions";

const DISP_COLORS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning",
  RETURNED_TO_STOCK: "success",
  FOR_REPAIR: "info",
  REPLACED: "default",
  VENDOR_RETURN: "default",
  SCRAPPED: "danger",
  UNDER_INVESTIGATION: "warning",
};

export default async function DefectivePage() {
  await requireRole("VIEWER");

  const rows = await db
    .select({
      id: defectiveItems.id,
      defectReason: defectiveItems.defectReason,
      defectDescription: defectiveItems.defectDescription,
      disposition: defectiveItems.disposition,
      inspectionNotes: defectiveItems.inspectionNotes,
      createdAt: defectiveItems.createdAt,
      inspectedAt: defectiveItems.inspectedAt,
      materialCode: materials.code,
      materialName: materials.name,
      technicianName: technicians.name,
      serialNumber: materialSerials.serialNumber,
    })
    .from(defectiveItems)
    .leftJoin(materials, eq(defectiveItems.materialId, materials.id))
    .leftJoin(technicians, eq(defectiveItems.technicianId, technicians.id))
    .leftJoin(materialSerials, eq(defectiveItems.serialId, materialSerials.id))
    .orderBy(desc(defectiveItems.createdAt));

  const [materialList, technicianList, warehouseList] = await Promise.all([
    db.select({ id: materials.id, code: materials.code, name: materials.name }).from(materials).where(eq(materials.isActive, true)).orderBy(materials.name),
    db.select({ id: technicians.id, employeeId: technicians.employeeId, name: technicians.name }).from(technicians).where(eq(technicians.isActive, true)).orderBy(technicians.name),
    db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses).where(eq(warehouses.isActive, true)),
  ]);

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Defective Items</h2>
          <p className="text-sm text-gray-500">Log defective returns and track inspection outcomes</p>
        </div>
        <DefectiveActions materials={materialList} technicians={technicianList} warehouses={warehouseList} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Material</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Serial</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Technician</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Defect Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reported</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Disposition</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Inspected</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No defective items recorded.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">[{row.materialCode}] {row.materialName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.serialNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{row.technicianName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{row.defectReason ?? row.defectDescription ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={DISP_COLORS[row.disposition ?? "PENDING"] ?? "default"}>
                      {(row.disposition ?? "PENDING").replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(row.inspectedAt)}</td>
                  <td className="px-4 py-3">
                    {row.disposition === "PENDING" && (
                      <ResolveButton id={row.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResolveButton({ id }: { id: string }) {
  return (
    <a href={`/defective/${id}/resolve`} className="text-xs text-blue-600 hover:underline font-medium">
      Resolve
    </a>
  );
}
