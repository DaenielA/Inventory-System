import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { technicians, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateUserAction, toggleUserActiveAction } from "../actions";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("ADMIN");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) notFound();

  const techList = await db
    .select({ id: technicians.id, name: technicians.name, employeeId: technicians.employeeId })
    .from(technicians)
    .where(eq(technicians.isActive, true))
    .orderBy(technicians.name);

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
        <p className="text-sm text-gray-500">Update the account details and role.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={(formData) => updateUserAction(id, formData)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
          <input name="name" defaultValue={user.name} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input type="email" name="email" defaultValue={user.email} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
          <input type="password" name="password" minLength={6} placeholder="Leave blank to keep current password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select name="role" defaultValue={user.role} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ADMIN">Admin</option>
              <option value="WAREHOUSE_CUSTODIAN">Warehouse Custodian</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Linked technician</label>
            <select name="technicianId" defaultValue={user.technicianId ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {techList.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="isActive" value="true" defaultChecked={user.isActive} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label className="text-sm text-gray-700">Active user</label>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/users" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</Link>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Changes</button>
        </div>
      </form>

      <form action={() => toggleUserActiveAction(id, !user.isActive)} className="rounded-xl border border-gray-200 bg-white p-4">
        <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
          {user.isActive ? "Deactivate user" : "Activate user"}
        </button>
      </form>
    </div>
  );
}
