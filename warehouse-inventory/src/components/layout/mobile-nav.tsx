"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Package,
  PackageCheck,
  PackageX,
  Search,
  HardHat,
} from "lucide-react";

const mobileNav = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/issue", label: "Issue", icon: PackageCheck },
  { href: "/technicians", label: "Techs", icon: HardHat },
  { href: "/returns", label: "Returns", icon: PackageX },
  { href: "/inventory", label: "Inventory", icon: Package },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                active ? "text-blue-600" : "text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
