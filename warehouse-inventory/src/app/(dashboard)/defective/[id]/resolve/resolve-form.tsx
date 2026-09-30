"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveDefectiveAction } from "../../actions";

function nowLocal() { return new Date().toISOString().slice(0, 16); }

export function ResolveForm({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("id", id);
    startTransition(async () => {
      const res = await resolveDefectiveAction(fd);
      if (res?.error) setError(res.error);
      else router.push("/defective");
    });
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Disposition *</label>
          <select name="disposition" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="RETURNED_TO_STOCK">Returned to Stock (Good)</option>
            <option value="FOR_REPAIR">Send for Repair</option>
            <option value="REPLACED">Replaced</option>
            <option value="VENDOR_RETURN">Vendor Return</option>
            <option value="SCRAPPED">Scrapped</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Result *</label>
          <textarea name="inspectionResult" rows={3} required placeholder="Describe what was found during inspection..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Inspected Date & Time *</label>
          <input type="datetime-local" name="inspectedAt" defaultValue={nowLocal()} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={2} placeholder="Additional notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={isPending}>Save Resolution</Button>
        </div>
      </form>
    </Card>
  );
}
