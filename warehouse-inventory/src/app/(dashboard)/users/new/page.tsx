import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { technicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { createUserAction } from "../actions";

export default async function NewUserPage() {
  await requireRole("ADMIN");

  const techList = await db
    .select({ id: technicians.id, name: technicians.name, employeeId: technicians.employeeId })
    .from(technicians)
    .where(eq(technicians.isActive, true))
    .orderBy(technicians.name);

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Create User</h2>
        <p className="text-sm text-gray-500">Add a staff account with the correct role.</p>
      </div>

      <form action={createUserAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
          <input name="name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input type="email" name="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input type="password" name="password" required minLength={6} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select name="role" defaultValue="WAREHOUSE_CUSTODIAN" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ADMIN">Admin</option>
              <option value="WAREHOUSE_CUSTODIAN">Warehouse Custodian</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Linked technician</label>
            <select name="technicianId" defaultValue="" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {techList.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="isActive" value="true" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label className="text-sm text-gray-700">Active user</label>
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/users" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</Link>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create User</button>
        </div>
      </form>
    </div>
  );
}
