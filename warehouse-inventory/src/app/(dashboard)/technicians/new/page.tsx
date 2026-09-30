import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { createTechnicianAction } from "../actions";

export default async function NewTechnicianPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("WAREHOUSE_CUSTODIAN");
  const { error } = await searchParams;

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Add Technician</h2>
        <p className="text-sm text-gray-500">Register a technician for material assignments.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createTechnicianAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label htmlFor="employeeId" className="mb-1 block text-sm font-medium text-gray-700">Employee ID *</label>
          <input id="employeeId" name="employeeId" required maxLength={50} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">Full name *</label>
          <input id="name" name="name" required minLength={2} maxLength={100} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input id="phone" name="phone" type="tel" maxLength={30} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label htmlFor="team" className="mb-1 block text-sm font-medium text-gray-700">Team</label>
          <input id="team" name="team" maxLength={100} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/technicians" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</Link>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Add Technician</button>
        </div>
      </form>
    </div>
  );
}