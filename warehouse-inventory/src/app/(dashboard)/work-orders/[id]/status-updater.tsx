"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateWorkOrderStatusAction } from "../actions";

type WOStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD";

function nowLocal() {
  return new Date().toISOString().slice(0, 16);
}

export function WorkOrderStatusUpdater({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<WOStatus>(currentStatus as WOStatus);
  const [completedDate, setCompletedDate] = useState(nowLocal());
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateWorkOrderStatusAction(
        id,
        status,
        status === "COMPLETED" ? completedDate : undefined
      );
      setSaved(true);
    });
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as WOStatus); setSaved(false); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      {status === "COMPLETED" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date & Time</label>
          <input
            type="datetime-local"
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      <Button size="sm" onClick={handleSave} loading={isPending}>Save Status</Button>
      {saved && <span className="text-sm text-green-600">✓ Saved</span>}
    </div>
  );
}
