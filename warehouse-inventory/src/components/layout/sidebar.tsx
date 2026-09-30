"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageCheck,
  PackageX,
  Users,
  HardHat,
  ClipboardList,
  BarChart3,
  Settings,
  ArrowLeftRight,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Truck,
  Search,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Item Tracking", icon: Search },
  { href: "/issue", label: "Issue Materials", icon: PackageCheck, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/technicians", label: "Technicians", icon: HardHat },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/receive", label: "Receive Stock", icon: PackagePlus, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/deliveries", label: "STO Deliveries", icon: Truck, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/returns", label: "Returns", icon: PackageX, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/install", label: "Install / Consume", icon: PackageCheck, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/pullouts", label: "Pull-Outs", icon: ArrowLeftRight, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { href: "/defective", label: "Defective Items", icon: AlertTriangle, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/reconciliation", label: "Reconciliation", icon: RefreshCw, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/materials", label: "Materials", icon: Package, roles: ["ADMIN"] },
  { href: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-gray-900 text-white min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">Warehouse IMS</h1>
        <p className="text-xs text-gray-400 mt-0.5">Globe AT HOME Contractor</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-700">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-white truncate">{userName}</p>
          <p className="text-xs text-gray-400">{userRole.replace("_", " ")}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
