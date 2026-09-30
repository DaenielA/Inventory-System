import { db } from "@/db";
import { materials, technicians, technicianAssignments } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/authorization";
import { and, desc, eq, ilike, or } from "drizzle-orm";

const statusVariant = {
  ASSIGNED: "info",
  INSTALLED: "success",
  CONSUMED: "gray",
  RETURNED: "warning",
} as const;

export default async function TrackingSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAuth();
  const { q, status } = await searchParams;
  const query = q?.trim() ?? "";
  const statuses = ["ASSIGNED", "INSTALLED", "CONSUMED", "RETURNED"] as const;
  const selectedStatus = statuses.find((candidate) => candidate === status);
  const filters = [];
  if (query) {
    filters.push(or(
      ilike(technicianAssignments.serialNumber, `%${query}%`),
      ilike(materials.code, `%${query}%`),
      ilike(materials.name, `%${query}%`),
      ilike(technicians.name, `%${query}%`),
      ilike(technicians.employeeId, `%${query}%`),
    ));
  }
  if (selectedStatus) filters.push(eq(technicianAssignments.status, selectedStatus));

  const rows = await db
    .select({
      id: technicianAssignments.id,
      serialNumber: technicianAssignments.serialNumber,
      materialCode: materials.code,
      materialName: materials.name,
      unit: materials.unit,
      quantity: technicianAssignments.quantity,
      technicianName: technicians.name,
      employeeId: technicians.employeeId,
      issuedAt: technicianAssignments.issuedAt,
      status: technicianAssignments.status,
    })
    .from(technicianAssignments)
    .innerJoin(materials, eq(technicianAssignments.materialId, materials.id))
    .innerJoin(technicians, eq(technicianAssignments.technicianId, technicians.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(technicianAssignments.issuedAt))
    .limit(100);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Item Tracking</h2>
        <p className="text-sm text-gray-500">Find who received an item, when it was issued, and its current status.</p>
      </div>

      <form method="get" action="/search" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
        <input
          type="search"
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Serial number, material, or technician"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="status"
          defaultValue={selectedStatus ?? ""}
          aria-label="Filter by assignment status"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="INSTALLED">Installed</option>
          <option value="CONSUMED">Consumed</option>
          <option value="RETURNED">Returned</option>
        </select>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      <div className="text-sm text-gray-500">
        {query || selectedStatus ? `${rows.length} matching assignment${rows.length === 1 ? "" : "s"}` : `Latest ${rows.length} assignments`}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Serial number</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Technician</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date issued</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.serialNumber ?? "Bulk item"}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{row.materialName}</p>
                  <p className="font-mono text-xs text-gray-500">{row.materialCode} · {Number(row.quantity)} {row.unit}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-900">{row.technicianName}</p>
                  <p className="text-xs text-gray-500">{row.employeeId}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                  {new Date(row.issuedAt).toLocaleString("en-PH")}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[row.status as keyof typeof statusVariant] ?? "gray"}>
                    {row.status === "ASSIGNED" ? "Assigned" : row.status[0] + row.status.slice(1).toLowerCase()}
                  </Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  {query ? "No matching tracked items." : "No technician assignments have been recorded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}