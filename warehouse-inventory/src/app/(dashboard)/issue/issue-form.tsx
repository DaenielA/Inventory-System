"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { issueMaterialsAction } from "./actions";
import { Trash2, Plus, CheckCircle, Copy } from "lucide-react";

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  requiresSerial: boolean;
  available: number;
}

interface Technician {
  id: string;
  employeeId: string;
  name: string;
  team: string | null;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface IssueFormProps {
  materials: Material[];
  technicians: Technician[];
  warehouses: Warehouse[];
}

interface LineItem {
  materialId: string;
  quantity: number;
  serialNumber: string;
  serialId: string;
  batchNumber: string;
}

export function IssueForm({ materials, technicians, warehouses }: IssueFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ txNumber: string; summary: string } | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const warehouseId = warehouses[0]?.id ?? "";
  const [items, setItems] = useState<LineItem[]>([
    { materialId: "", quantity: 1, serialNumber: "", serialId: "", batchNumber: "" },
  ]);

  function addItem() {
    setItems((prev) => [...prev, { materialId: "", quantity: 1, serialNumber: "", serialId: "", batchNumber: "" }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function getMaterial(id: string) {
    return materials.find((m) => m.id === id);
  }

  function getTechnician(id: string) {
    return technicians.find((t) => t.id === id);
  }

  function buildTelegramSummary(txNumber: string) {
    const tech = getTechnician(technicianId);
    const date = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
    const lines = items
      .filter((i) => i.materialId && i.quantity > 0)
      .map((i) => {
        const mat = getMaterial(i.materialId);
        const serial = i.serialNumber.trim() ? ` (SN: ${i.serialNumber.trim()})` : "";
        return `- ${mat?.name ?? "?"} x${i.quantity} ${mat?.unit ?? ""}${serial}`;
      });
    return [
      "MATERIAL WITHDRAWAL",
      "",
      `Date: ${date}`,
      `Technician: ${tech?.name ?? "?"}`,
      "",
      "Materials:",
      ...lines,
      "",
      `Transaction: ${txNumber}`,
    ].filter((l) => l !== null).join("\n");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessInfo(null);

    if (!technicianId) { setError("Select a technician."); return; }
    const validItems = items.filter((i) => i.materialId && i.quantity > 0);
    if (!validItems.length) { setError("Add at least one item."); return; }

    // Client-side stock check
    for (const item of validItems) {
      const mat = getMaterial(item.materialId);
      if (mat?.requiresSerial && !item.serialNumber.trim()) {
        setError(`Enter the serial number for ${mat.name}.`);
        return;
      }
      if (mat && !mat.requiresSerial && item.serialNumber.trim()) {
        setError(`${mat.name} is not serial-tracked. Leave the serial number blank.`);
        return;
      }
    }

    const fd = new FormData();
    fd.set("technicianId", technicianId);
    if (warehouseId) fd.set("warehouseId", warehouseId);
    fd.set("workOrderId", "");
    fd.set("purpose", "");
    fd.set("notes", "");
    fd.set("items", JSON.stringify(validItems.map((i) => ({
      materialId: i.materialId,
      quantity: i.quantity,
      serialNumber: i.serialNumber.trim() || undefined,
      serialId: i.serialId || undefined,
      batchNumber: i.batchNumber || undefined,
    }))));

    startTransition(async () => {
      const result = await issueMaterialsAction(fd);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        const summary = buildTelegramSummary(result.transactionNumber);
        setSuccessInfo({
          txNumber: result.transactionNumber,
          summary: result.openingTransactionNumber
            ? `${summary}\nOpening stock transaction: ${result.openingTransactionNumber}`
            : summary,
        });
        setItems([{ materialId: "", quantity: 1, serialNumber: "", serialId: "", batchNumber: "" }]);
        setTechnicianId("");
      }
    });
  }

  if (successInfo) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Issuance recorded — {successInfo.txNumber}
        </div>
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Telegram Proof</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(successInfo.summary)}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap text-gray-700">
            {successInfo.summary}
          </pre>
        </Card>
        <Button onClick={() => setSuccessInfo(null)}>Issue More Materials</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Assign Materials</h3>
          <p className="mt-1 text-xs text-gray-500">Issuance date and time are recorded automatically when you confirm.</p>
        </div>
        <div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician *</label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select technician...</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.employeeId}{t.team ? ` (${t.team})` : ""}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Materials to Issue</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>

        {items.map((item, i) => {
          const mat = getMaterial(item.materialId);
          const available = mat?.available ?? 0;
          return (
            <div key={i} className="space-y-3 rounded-lg border border-gray-200 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                    <select
                      value={item.materialId}
                      onChange={(e) => {
                        const selectedMaterial = getMaterial(e.target.value);
                        updateItem(i, "materialId", e.target.value);
                        updateItem(i, "serialNumber", "");
                        if (selectedMaterial?.requiresSerial) updateItem(i, "quantity", 1);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select material...</option>
                        {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.available} {m.unit} available
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity {mat ? `(${mat.unit}${mat.requiresSerial ? ", fixed at 1" : ""})` : ""}
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                      disabled={mat?.requiresSerial}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      required
                    />
                    {mat && !mat.requiresSerial && (
                      <p className="mt-1 text-xs text-gray-500">Currently recorded: {available} {mat.unit}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Serial number {mat?.requiresSerial ? "*" : "(serialized items only)"}</label>
                    <input
                      type="text"
                      value={item.serialNumber}
                      onChange={(e) => updateItem(i, "serialNumber", e.target.value)}
                      disabled={!mat?.requiresSerial}
                      required={mat?.requiresSerial}
                      maxLength={100}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder={mat?.requiresSerial ? "Scan or enter serial number" : "Not required"}
                    />
                  </div>
                  {mat && !mat.requiresSerial && item.quantity > available && (
                    <p className="sm:col-span-2 text-xs text-amber-700">The unrecorded portion will be logged as opening stock when issued.</p>
                  )}
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="mt-6 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          Confirm Issuance
        </Button>
      </div>
    </form>
  );
}
