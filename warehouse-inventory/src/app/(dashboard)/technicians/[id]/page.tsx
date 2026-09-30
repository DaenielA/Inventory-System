import { requireAuth } from "@/lib/authorization";
import { db } from "@/db";
import { technicians, inventoryTransactions, materials, technicianAssignments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssignmentStatusActions } from "../assignment-status-actions";

export default async function TechnicianDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const [tech] = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!tech) notFound();

  const assignments = await db
    .select({
      id: technicianAssignments.id,
      materialName: materials.name,
      materialCode: materials.code,
      unit: materials.unit,
      serialNumber: technicianAssignments.serialNumber,
      quantity: technicianAssignments.quantity,
      status: technicianAssignments.status,
      issuedAt: technicianAssignments.issuedAt,
    })
    .from(technicianAssignments)
    .innerJoin(materials, eq(technicianAssignments.materialId, materials.id))
    .where(eq(technicianAssignments.technicianId, id))
    .orderBy(desc(technicianAssignments.issuedAt));

  // Recent transactions
  const recentTx = await db
    .select({
      id: inventoryTransactions.id,
      transactionNumber: inventoryTransactions.transactionNumber,
      type: inventoryTransactions.type,
      transactedAt: inventoryTransactions.transactedAt,
    })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.technicianId, id))
    .orderBy(desc(inventoryTransactions.transactedAt))
    .limit(10);

  const assigned = assignments.filter((assignment) => assignment.status === "ASSIGNED");
  const totalOutstanding = assigned.reduce((sum, assignment) => sum + Number(assignment.quantity), 0);
  const installedOrConsumed = assignments
    .filter((assignment) => assignment.status === "INSTALLED" || assignment.status === "CONSUMED")
    .reduce((sum, assignment) => sum + Number(assignment.quantity), 0);
  const returned = assignments
    .filter((assignment) => assignment.status === "RETURNED")
    .reduce((sum, assignment) => sum + Number(assignment.quantity), 0);

  const txTypeColors: Record<string, string> = {
    RECEIVE: "text-green-600", ISSUE: "text-blue-600", RETURN: "text-yellow-600",
    CONSUME: "text-purple-600", INSTALL: "text-purple-600", PULLOUT: "text-orange-600",
    TRANSFER: "text-gray-600", ADJUST: "text-red-600",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/technicians" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{tech.name}</h2>
          <p className="text-sm text-gray-500">{tech.employeeId}{tech.team ? ` · ${tech.team}` : ""}</p>
        </div>
        <Badge variant={tech.isActive ? "success" : "gray"} className="ml-auto">
          {tech.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Assigned", value: assigned.length, color: assigned.length > 0 ? "text-orange-600" : "text-gray-900" },
          { label: "Total Units Out", value: totalOutstanding, color: totalOutstanding > 0 ? "text-blue-600" : "text-gray-900" },
          { label: "Installed / Consumed", value: installedOrConsumed, color: "text-emerald-700" },
          { label: "Returned", value: returned, color: "text-amber-700" },
        ].map((stat) => (
          <Card key={stat.label} className="p-3 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Accountability table */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Withdrawn Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Item</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Serial number</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Quantity</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Issued</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Status / Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.map((assignment) => {
                return (
                  <tr key={assignment.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-900">{assignment.materialName}</p>
                      <p className="text-xs text-gray-400 font-mono">{assignment.materialCode}</p>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">
                      {assignment.serialNumber ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {Number(assignment.quantity)} {assignment.unit}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                      {new Date(assignment.issuedAt).toLocaleString("en-PH")}
                    </td>
                    <td className="px-4 py-2">
                      <AssignmentStatusActions
                        assignmentId={assignment.id}
                        status={assignment.status as "ASSIGNED" | "INSTALLED" | "CONSUMED" | "RETURNED"}
                      />
                    </td>
                  </tr>
                );
              })}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    No materials issued to this technician yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent transactions */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentTx.map((tx) => (
            <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 font-mono">{tx.transactionNumber}</p>
                <p className="text-xs text-gray-500">{new Date(tx.transactedAt).toLocaleString("en-PH")}</p>
              </div>
              <span className={`text-xs font-medium ${txTypeColors[tx.type] ?? "text-gray-600"}`}>{tx.type}</span>
            </div>
          ))}
          {recentTx.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No transactions yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
