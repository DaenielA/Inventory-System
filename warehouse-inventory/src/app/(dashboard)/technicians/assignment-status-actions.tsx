"use client";

import { useState, useTransition } from "react";
import { Check, PackageCheck, RotateCcw } from "lucide-react";
import { updateTechnicianAssignmentStatusAction } from "./actions";

type AssignmentStatus = "ASSIGNED" | "INSTALLED" | "CONSUMED" | "RETURNED";

interface AssignmentStatusActionsProps {
  assignmentId: string;
  status: AssignmentStatus;
}

const statusStyles: Record<AssignmentStatus, string> = {
  ASSIGNED: "bg-blue-50 text-blue-700",
  INSTALLED: "bg-emerald-50 text-emerald-700",
  CONSUMED: "bg-gray-100 text-gray-700",
  RETURNED: "bg-amber-50 text-amber-700",
};

export function AssignmentStatusActions({ assignmentId, status: initialStatus }: AssignmentStatusActionsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState("");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateStatus(nextStatus: Exclude<AssignmentStatus, "ASSIGNED">) {
    setError("");
    setTransactionNumber("");
    startTransition(async () => {
      const result = await updateTechnicianAssignmentStatusAction(assignmentId, nextStatus);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus(nextStatus);
      setTransactionNumber(result.transactionNumber ?? "");
    });
  }

  return (
    <div className="min-w-52 space-y-2">
      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${statusStyles[status]}`}>
        {status === "ASSIGNED" ? "Assigned" : status === "RETURNED" ? "Returned" : status[0] + status.slice(1).toLowerCase()}
      </span>
      {status === "ASSIGNED" && (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={isPending} onClick={() => updateStatus("INSTALLED")} className="inline-flex items-center gap-1 rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
            <Check className="h-3 w-3" /> Installed
          </button>
          <button type="button" disabled={isPending} onClick={() => updateStatus("CONSUMED")} className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <PackageCheck className="h-3 w-3" /> Consumed
          </button>
          <button type="button" disabled={isPending} onClick={() => updateStatus("RETURNED")} className="inline-flex items-center gap-1 rounded border border-amber-200 px-2 py-1 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-50">
            <RotateCcw className="h-3 w-3" /> Returned
          </button>
        </div>
      )}
      {isPending && <p className="text-xs text-gray-500">Saving status…</p>}
      {transactionNumber && <p className="text-xs text-gray-500">Recorded: {transactionNumber}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
