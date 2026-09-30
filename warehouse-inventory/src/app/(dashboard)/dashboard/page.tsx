import { requireAuth } from "@/lib/authorization";
import { db } from "@/db";
import {
  materials,
  inventoryTransactionItems,
  inventoryTransactions,
  technicians,
  technicianAssignments,
  workOrders,
} from "@/db/schema";
import { eq, sql, gte, count } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  HardHat,
  AlertTriangle,
  TrendingDown,
  ClipboardList,
  CheckCircle,
  RefreshCw,
  Wrench,
  Search,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Inventory by status (derived from transaction items)
  const statusCounts = await db
    .select({
      status: inventoryTransactionItems.toStatus,
      total: sql<number>`sum(${inventoryTransactionItems.quantityDelta}::numeric)`,
    })
    .from(inventoryTransactionItems)
    .groupBy(inventoryTransactionItems.toStatus);

  const statusMap = Object.fromEntries(
    statusCounts.map((r) => [r.status, Number(r.total)])
  );

  const materialBalances = await db
    .select({
      materialId: inventoryTransactionItems.materialId,
      available: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryTransactionItems.toStatus} IN ('AVAILABLE', 'RETURNED_GOOD') OR ${inventoryTransactionItems.fromStatus} = 'AVAILABLE' THEN ${inventoryTransactionItems.quantityDelta}::numeric ELSE 0 END), 0)`,
    })
    .from(inventoryTransactionItems)
    .groupBy(inventoryTransactionItems.materialId);
  const availableByMaterial = Object.fromEntries(
    materialBalances.map((balance) => [balance.materialId, Math.max(0, Number(balance.available))]),
  );

  const assignmentCounts = await db
    .select({
      status: technicianAssignments.status,
      count: count(),
      quantity: sql<number>`COALESCE(SUM(${technicianAssignments.quantity}::numeric), 0)`,
    })
    .from(technicianAssignments)
    .groupBy(technicianAssignments.status);
  const assignmentMap = Object.fromEntries(
    assignmentCounts.map((row) => [row.status, { count: row.count, quantity: Number(row.quantity) }]),
  );

  // Low stock materials
  const lowStockMaterials = await db
    .select({ id: materials.id, name: materials.name, minStock: materials.minStock })
    .from(materials)
    .where(eq(materials.isActive, true));

  // Today's transactions
  const todayTxCount = await db
    .select({ count: count() })
    .from(inventoryTransactions)
    .where(gte(inventoryTransactions.transactedAt, today));

  // Active technicians with materials
  const activeTechCount = await db
    .select({ count: count() })
    .from(technicians)
    .where(eq(technicians.isActive, true));

  // Pending work orders
  const pendingWO = await db
    .select({ count: count() })
    .from(workOrders)
    .where(eq(workOrders.status, "PENDING"));

  return {
    available: Object.values(availableByMaterial).reduce((sum, quantity) => sum + quantity, 0),
    assignedItems: assignmentMap["ASSIGNED"]?.count ?? 0,
    assignedUnits: assignmentMap["ASSIGNED"]?.quantity ?? 0,
    activeTechnicians: activeTechCount[0]?.count ?? 0,
    installedConsumed: (assignmentMap["INSTALLED"]?.quantity ?? 0) + (assignmentMap["CONSUMED"]?.quantity ?? 0),
    returnedItems: assignmentMap["RETURNED"]?.count ?? 0,
    defective: Math.max(0, statusMap["DEFECTIVE"] ?? 0),
    forInspection: Math.max(0, statusMap["FOR_INSPECTION"] ?? 0),
    forRepair: Math.max(0, statusMap["FOR_REPAIR"] ?? 0),
    todayTransactions: todayTxCount[0]?.count ?? 0,
    pendingWorkOrders: pendingWO[0]?.count ?? 0,
    lowStockCount: lowStockMaterials.filter((m) => (availableByMaterial[m.id] ?? 0) < m.minStock).length,
  };
}

async function getRecentTransactions() {
  return db
    .select({
      id: inventoryTransactions.id,
      transactionNumber: inventoryTransactions.transactionNumber,
      type: inventoryTransactions.type,
      transactedAt: inventoryTransactions.transactedAt,
    })
    .from(inventoryTransactions)
    .orderBy(sql`${inventoryTransactions.transactedAt} desc`)
    .limit(5);
}

const statCards = [
  { key: "assignedItems", label: "Assigned Items", icon: PackageCheck, color: "text-blue-600", bg: "bg-blue-50", href: "/search?status=ASSIGNED" },
  { key: "assignedUnits", label: "Units With Technicians", icon: HardHat, color: "text-orange-600", bg: "bg-orange-50", href: "/technicians" },
  { key: "activeTechnicians", label: "Active Technicians", icon: HardHat, color: "text-emerald-700", bg: "bg-emerald-50", href: "/technicians" },
  { key: "installedConsumed", label: "Installed / Consumed", icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50", href: "/search" },
  { key: "returnedItems", label: "Returned Items", icon: RefreshCw, color: "text-amber-700", bg: "bg-amber-50", href: "/search?status=RETURNED" },
  { key: "available", label: "Available Stock", icon: Package, color: "text-gray-600", bg: "bg-gray-50", href: "/inventory?status=AVAILABLE" },
  { key: "defective", label: "Defective", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/defective" },
  { key: "pendingWorkOrders", label: "Pending Work Orders", icon: ClipboardList, color: "text-gray-600", bg: "bg-gray-50", href: "/work-orders?status=PENDING" },
  { key: "lowStockCount", label: "Low Stock Items", icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", href: "/inventory?filter=low_stock" },
  { key: "forInspection", label: "For Inspection", icon: RefreshCw, color: "text-yellow-600", bg: "bg-yellow-50", href: "/defective?status=FOR_INSPECTION" },
  { key: "forRepair", label: "For Repair", icon: Wrench, color: "text-orange-600", bg: "bg-orange-50", href: "/defective?status=FOR_REPAIR" },
];

const txTypeLabels: Record<string, { label: string; color: string }> = {
  RECEIVE: { label: "Received", color: "text-green-600" },
  ISSUE: { label: "Issued", color: "text-blue-600" },
  RETURN: { label: "Returned", color: "text-yellow-600" },
  CONSUME: { label: "Consumed", color: "text-purple-600" },
  INSTALL: { label: "Installed", color: "text-purple-600" },
  PULLOUT: { label: "Pull-Out", color: "text-orange-600" },
  TRANSFER: { label: "Transfer", color: "text-gray-600" },
  ADJUST: { label: "Adjustment", color: "text-red-600" },
};

export default async function DashboardPage() {
  await requireAuth();
  const [stats, recentTx] = await Promise.all([
    getDashboardStats(),
    getRecentTransactions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map(({ key, label, icon: Icon, color, bg, href }) => (
          <Link key={key} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats[key as keyof typeof stats].toLocaleString()}
                    </p>
                  </div>
                  <div className={`${bg} p-2 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/search", label: "Find Item by Serial", icon: Search, color: "bg-slate-900" },
            { href: "/issue", label: "Assign Materials", icon: PackageCheck, color: "bg-blue-600" },
            { href: "/technicians", label: "Technician Records", icon: HardHat, color: "bg-emerald-700" },
            { href: "/inventory", label: "Stock Overview", icon: Package, color: "bg-gray-600" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`${action.color} text-white rounded-lg p-4 flex items-center gap-3 hover:opacity-90 transition-opacity`}
            >
              <action.icon className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Recent Transactions</h3>
          <Link href="/inventory" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentTx.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No transactions yet. Start by receiving stock.
            </div>
          ) : (
            recentTx.map((tx) => {
              const meta = txTypeLabels[tx.type] ?? { label: tx.type, color: "text-gray-600" };
              return (
                <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.transactionNumber}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.transactedAt).toLocaleString("en-PH")}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
