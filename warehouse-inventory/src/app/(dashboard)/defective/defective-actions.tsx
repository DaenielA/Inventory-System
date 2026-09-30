"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { logDefectiveAction } from "./actions";
import { Plus, X, CheckCircle } from "lucide-react";

interface Props {
  materials: { id: string; code: string; name: string }[];
  technicians: { id: string; employeeId: string; name: string }[];
  warehouses: { id: string; name: string }[];
}

function nowLocal() { return new Date().toISOString().slice(0, 16); }

export function DefectiveActions({ materials, technicians, warehouses }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await logDefectiveAction(fd);
      if (res?.error) setError(res.error);
      else { setSuccess(true); setTimeout(() => { setOpen(false); setSuccess(false); }, 1500); }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Log Defective
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Log Defective Item</h3>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>

            {success ? (
              <div className="flex items-center gap-2 text-green-700 py-4 justify-center">
                <CheckCircle className="h-5 w-5" /> Logged successfully
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Material *</label>
                    <select name="materialId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select...</option>
                      {materials.map(m => <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse *</label>
                    <select name="warehouseId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Technician</label>
                    <select name="technicianId" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— None —</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <Input label="Serial ID (if serialized)" name="serialId" placeholder="UUID of serial record" />
                  <Input label="Work Order / J.O." name="workOrderId" placeholder="e.g. WO-12345" />
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reported Date & Time *</label>
                    <input type="datetime-local" name="reportedAt" defaultValue={nowLocal()} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <Input label="Defect Reason *" name="defectReason" placeholder="e.g. No power, broken port..." required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea name="description" rows={2} placeholder="Additional details..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm" loading={isPending}>Log Defective</Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
