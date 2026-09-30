"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createWorkOrderAction } from "../actions";

interface Technician {
  id: string;
  employeeId: string;
  name: string;
}

interface WorkOrderFormProps {
  technicians: Technician[];
}

function nowLocal() {
  return new Date().toISOString().slice(0, 16);
}

export function WorkOrderForm({ technicians }: WorkOrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createWorkOrderAction(fd);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push(`/work-orders/${result.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Work Order Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="J.O. Number *" name="joNumber" placeholder="e.g. WO-12345" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              name="type"
              defaultValue="INSTALLATION"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INSTALLATION">Installation</option>
              <option value="REPAIR">Repair</option>
              <option value="PULLOUT">Pull-Out</option>
              <option value="UPGRADE">Upgrade</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select
              name="status"
              defaultValue="PENDING"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              name="technicianId"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Unassigned —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
              ))}
            </select>
          </div>
          <Input label="Customer Reference" name="customerReference" placeholder="e.g. account number" />
          <Input label="Address" name="address" placeholder="Installation/repair address" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              name="scheduledDate"
              defaultValue={nowLocal()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date & Time</label>
            <input
              type="datetime-local"
              name="completedDate"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              name="remarks"
              rows={3}
              placeholder="Additional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={isPending}>Create Work Order</Button>
      </div>
    </form>
  );
}
