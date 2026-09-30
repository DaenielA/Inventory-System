import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { defectiveItems, materials, technicians, materialSerials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ResolveForm } from "./resolve-form";

export default async function ResolvePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("WAREHOUSE_CUSTODIAN");
  const { id } = await params;

  const [item] = await db
    .select({
      id: defectiveItems.id,
      defectReason: defectiveItems.defectReason,
      defectDescription: defectiveItems.defectDescription,
      disposition: defectiveItems.disposition,
      createdAt: defectiveItems.createdAt,
      materialCode: materials.code,
      materialName: materials.name,
      technicianName: technicians.name,
      serialNumber: materialSerials.serialNumber,
    })
    .from(defectiveItems)
    .leftJoin(materials, eq(defectiveItems.materialId, materials.id))
    .leftJoin(technicians, eq(defectiveItems.technicianId, technicians.id))
    .leftJoin(materialSerials, eq(defectiveItems.serialId, materialSerials.id))
    .where(eq(defectiveItems.id, id));

  if (!item) notFound();

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Resolve Defective Item</h2>
        <p className="text-sm text-gray-500">Record inspection result and final disposition</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <p><span className="text-gray-500">Material:</span> <strong>[{item.materialCode}] {item.materialName}</strong></p>
        {item.serialNumber && <p><span className="text-gray-500">Serial:</span> <span className="font-mono">{item.serialNumber}</span></p>}
        {item.technicianName && <p><span className="text-gray-500">Technician:</span> {item.technicianName}</p>}
        <p><span className="text-gray-500">Defect:</span> {item.defectReason ?? item.defectDescription ?? "—"}</p>
        <p><span className="text-gray-500">Reported:</span> {fmt(item.createdAt)}</p>
      </div>

      <ResolveForm id={id} />
    </div>
  );
}
