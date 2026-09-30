import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { materials, pullouts, technicians, warehouses, materialSerials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { logPulloutAction } from "./actions";

const reasonColors: Record<string, "default" | "warning" | "success" | "danger" | "info"> = {
  DEFECTIVE: "danger",
  VENDOR_RETURN: "default",
  REPLACEMENT: "info",
  TRANSFER: "warning",
  INVESTIGATION: "warning",
  REPAIR: "info",
  DISPOSAL: "danger",
  OTHER: "default",
};

export default async function PulloutsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole("WAREHOUSE_CUSTODIAN");
  const params = (await searchParams) ?? {};
  const success = params.success === "1";
  const error = params.error ? decodeURIComponent(params.error) : "";

  const [rows, materialList, technicianList, warehouseList] = await Promise.all([
    db
      .select({
        id: pullouts.id,
        pulloutNumber: pullouts.pulloutNumber,
        reason: pullouts.reason,
        destination: pullouts.destination,
        pulledOutAt: pullouts.pulledOutAt,
        notes: pullouts.notes,
        materialName: materials.name,
        serialNumber: materialSerials.serialNumber,
        technicianName: technicians.name,
      })
      .from(pullouts)
      .leftJoin(materials, eq(pullouts.transactionId, materials.id))
      .leftJoin(materialSerials, eq(pullouts.transactionId, materialSerials.id))
      .leftJoin(technicians, eq(pullouts.responsiblePersonId, technicians.id))
      .orderBy(desc(pullouts.pulledOutAt))
      .limit(20),
    db.select({ id: materials.id, code: materials.code, name: materials.name }).from(materials).where(eq(materials.isActive, true)).orderBy(materials.name),
    db.select({ id: technicians.id, name: technicians.name }).from(technicians).where(eq(technicians.isActive, true)).orderBy(technicians.name),
    db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses).where(eq(warehouses.isActive, true)).orderBy(warehouses.name),
  ]);

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pull-Outs</h2>
        <p className="text-sm text-gray-500">Log material pull-outs with timestamp and destination.</p>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Pull-out saved successfully.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <form action={logPulloutAction} className="grid gap-3 md:grid-cols-6">
          <select name="materialId" required defaultValue="" className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select material</option>
            {materialList.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
          </select>

          <select name="technicianId" defaultValue="" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Technician</option>
            {technicianList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select name="warehouseId" defaultValue={warehouseList[0]?.id ?? ""} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {warehouseList.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select name="reason" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="DEFECTIVE">Defective</option>
            <option value="VENDOR_RETURN">Vendor Return</option>
            <option value="REPLACEMENT">Replacement</option>
            <option value="TRANSFER">Transfer</option>
            <option value="INVESTIGATION">Investigation</option>
            <option value="REPAIR">Repair</option>
            <option value="DISPOSAL">Disposal</option>
            <option value="OTHER">Other</option>
          </select>

          <input name="quantity" type="number" min={1} defaultValue={1} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <input name="pulledOutAt" type="datetime-local" required className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <input name="destination" placeholder="Destination" required className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="serialId" placeholder="Serial ID (optional)" className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="notes" placeholder="Notes" className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <div className="md:col-span-6 flex justify-end">
            <button type="submit" className="inline-flex items-center justify-center bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
              Save pull-out
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Material</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Destination</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Technician</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pulled at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No pull-outs recorded.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.pulloutNumber}</td>
                  <td className="px-4 py-3">{row.materialName ?? "—"}</td>
                  <td className="px-4 py-3"><Badge variant={reasonColors[row.reason] ?? "default"}>{row.reason.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-3 text-gray-700">{row.destination}</td>
                  <td className="px-4 py-3 text-gray-700">{row.technicianName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmt(row.pulledOutAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
