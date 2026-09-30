import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type UserRole = "ADMIN" | "WAREHOUSE_CUSTODIAN" | "TECHNICIAN" | "VIEWER";

const roleHierarchy: Record<UserRole, number> = {
  ADMIN: 4,
  WAREHOUSE_CUSTODIAN: 3,
  TECHNICIAN: 2,
  VIEWER: 1,
};

export function hasRole(userRole: string, requiredRole: UserRole): boolean {
  return (roleHierarchy[userRole as UserRole] ?? 0) >= roleHierarchy[requiredRole];
}

export function canManageInventory(role: string): boolean {
  return hasRole(role, "WAREHOUSE_CUSTODIAN");
}

export function canManageUsers(role: string): boolean {
  return hasRole(role, "ADMIN");
}

export function canViewOnly(role: string): boolean {
  return role === "VIEWER";
}

/** Use in server components/actions to require authentication */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/** Use in server components/actions to require a minimum role */
export async function requireRole(role: UserRole) {
  const session = await requireAuth();
  if (!hasRole(session.user.role, role)) {
    redirect("/dashboard?error=unauthorized");
  }
  return session;
}
