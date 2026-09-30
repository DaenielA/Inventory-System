"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { installMaterialsAction } from "./actions";
import { Trash2, Plus, CheckCircle } from "lucide-react";

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface Technician {
  id: string;
  employeeId: string;
  name: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface WorkOrder {
  id: string;
  joNumber: string;
}

interface InstallFormProps {
  materials: Material[];
  technicians: Technician[];
  warehouses: Warehouse[];
  workOrders: WorkOrder[];
}

interface LineItem {
  materialId: string;
  quantity: number;
  serialId: string;
  action: "INSTALL" | "CONSUME";
}

function nowLocal() {
  return new Date().toISOString().slice(0, 16);
}

export function InstallForm({ materials, technicians, warehouses, workOrders }: InstallFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [workOrderId, setWorkOrderId] = useState("");
  const [consumedAt, setConsumedAt] = useState(nowLocal());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { materialId: "", quantity: 1, serialId: "", action: "INSTALL" },
  ]);

  function addItem() {
    setItems((p) => [...p, { materialId: "", quantity: 1, serialId: "", action: "INSTALL" }]);
  }

  function removeItem(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!technicianId) { setError("Select a technician."); return; }
    const validItems = items.filter((i) => i.materialId && i.quantity > 0);
    if (!validItems.length) { setError("Add at least one item."); return; }

    const fd = new FormData();
    fd.set("technicianId", technicianId);
    fd.set("warehouseId", warehouseId);
    fd.set("workOrderId", workOrderId);
    fd.set("consumedAt", consumedAt);
    fd.set("notes", notes);
    fd.set("items", JSON.stringify(validItems.map((i) => ({
      materialId: i.materialId,
      quantity: i.quantity,
      serialId: i.serialId || undefined,
      action: i.action,
    }))));

    startTransition(async () => {
      const result = await installMaterialsAction(fd);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(`✅ Recorded — ${result.transactionNumber}`);
        setItems([{ materialId: "", quantity: 1, serialId: "", action: "INSTALL" }]);
        setTechnicianId("");
        setWorkOrderId("");
        setNotes("");
        setConsumedAt(nowLocal());
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Installation / Consumption Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <option key={t.id} value={t.id}>{t.name} — {t.employeeId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={consumedAt}
              onChange={(e) => setConsumedAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Order / J.O.</label>
            <select
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>{wo.joNumber}</option>
              ))}
            </select>
          </div>
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional remarks..."
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Materials</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>

        {items.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                  <select
                    value={item.materialId}
                    onChange={(e) => updateItem(i, "materialId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select material...</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                  <select
                    value={item.action}
                    onChange={(e) => updateItem(i, "action", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INSTALL">Installed (e.g. modem, cable)</option>
                    <option value="CONSUME">Consumed (e.g. FIC, connector)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <Input
                  label="Serial ID (if serialized)"
                  value={item.serialId}
                  onChange={(e) => updateItem(i, "serialId", e.target.value)}
                  placeholder="Leave blank for qty-only items"
                />
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
        ))}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit" loading={isPending}>Record Installation</Button>
      </div>
    </form>
  );
}
