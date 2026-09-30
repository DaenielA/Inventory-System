import { requireAuth } from "@/lib/authorization";
import { db } from "@/db";
import { technicians, technicianAssignments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, HardHat } from "lucide-react";

export default async function TechniciansPage() {
  const session = await requireAuth();

  const techList = await db
    .select()
    .from(technicians)
    .orderBy(technicians.name);

  // Get outstanding material count per technician
  const outstanding = await db
    .select({
      technicianId: technicianAssignments.technicianId,
      count: sql<number>`count(distinct ${technicianAssignments.materialId})`,
    })
    .from(technicianAssignments)
    .where(eq(technicianAssignments.status, "ASSIGNED"))
    .groupBy(technicianAssignments.technicianId);

  const outstandingMap = Object.fromEntries(
    outstanding.map((o) => [o.technicianId, Number(o.count)])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Technicians</h2>
          <p className="text-sm text-gray-500">{techList.length} technicians</p>
        </div>
        {(session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_CUSTODIAN") && (
          <Link
            href="/technicians/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Technician
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {techList.map((tech) => {
          const outstanding_count = outstandingMap[tech.id] ?? 0;
          return (
            <Link key={tech.id} href={`/technicians/${tech.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                    <HardHat className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{tech.name}</p>
                      <Badge variant={tech.isActive ? "success" : "gray"}>
                        {tech.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{tech.employeeId}</p>
                    {tech.team && (
                      <p className="text-xs text-gray-500">{tech.team}</p>
                    )}
                    {outstanding_count > 0 && (
                      <div className="mt-2">
                        <Badge variant="warning">
                          {outstanding_count} material type{outstanding_count !== 1 ? "s" : ""} outstanding
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {techList.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-gray-400">
            No technicians yet.
          </div>
        )}
      </div>
    </div>
  );
}
