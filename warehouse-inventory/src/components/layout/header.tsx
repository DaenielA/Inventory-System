"use client";

import { Menu, Bell, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, PackagePlus, PackageCheck, PackageX,
  Users, HardHat, ClipboardList, BarChart3, Settings,
  ArrowLeftRight, AlertTriangle, RefreshCw, LogOut, X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Item Tracking", icon: Search },
  { href: "/issue", label: "Issue Materials", icon: PackageCheck, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/technicians", label: "Technicians", icon: HardHat },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/receive", label: "Receive Stock", icon: PackagePlus, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/returns", label: "Returns", icon: PackageX, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/pullouts", label: "Pull-Outs", icon: ArrowLeftRight, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { href: "/defective", label: "Defective Items", icon: AlertTriangle, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/reconciliation", label: "Reconciliation", icon: RefreshCw, roles: ["ADMIN", "WAREHOUSE_CUSTODIAN"] },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/materials", label: "Materials", icon: Package, roles: ["ADMIN"] },
  { href: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
];

interface HeaderProps {
  userRole: string;
  userName: string;
  pageTitle?: string;
}

export function Header({ userRole, userName, pageTitle }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="lg:hidden">
            <h1 className="text-sm font-bold text-gray-900">Warehouse IMS</h1>
          </div>
          {pageTitle && (
            <h2 className="hidden lg:block text-lg font-semibold text-gray-900">{pageTitle}</h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <form action="/search" method="get" className="hidden sm:flex items-center relative">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" />
            <input
              type="search"
              name="q"
              placeholder="Search serial or technician"
              aria-label="Search serial number or technician"
              className="w-56 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 relative">
            <Bell className="h-5 w-5 text-gray-600" />
          </button>
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{userRole.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-gray-900 text-white h-full overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
              <div>
                <h1 className="text-lg font-bold">Warehouse IMS</h1>
                <p className="text-xs text-gray-400">Globe AT HOME Contractor</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-1 rounded hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-gray-700">
              <div className="px-3 py-2 mb-1">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-gray-400">{userRole.replace("_", " ")}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
