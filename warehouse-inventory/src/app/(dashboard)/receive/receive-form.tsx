"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { receiveStockAction } from "./actions";
import { Trash2, Plus, CheckCircle } from "lucide-react";

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  requiresSerial: boolean;
  requiresBatch: boolean;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface ReceiveFormProps {
  materials: Material[];
  warehouses: Warehouse[];
}

interface LineItem {
  materialId: string;
  quantity: number;
  batchNumber: string;
  serialNumbers: string;
}

function todayLocal() {
  const d = new Date();
  return d.toISOString().slice(0, 16);
}

export function ReceiveForm({ materials, warehouses }: ReceiveFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [stoNumber, setStoNumber] = useState("");
  const [deliveredAt, setDeliveredAt] = useState(todayLocal());
  const [supplier, setSupplier] = useState("");
  const [referenceDocument, setReferenceDocument] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { materialId: "", quantity: 1, batchNumber: "", serialNumbers: "" },
  ]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { materialId: "", quantity: 1, batchNumber: "", serialNumbers: "" },
    ]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(
    i: number,
    field: keyof LineItem,
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  }

  function getMaterial(id: string) {
    return materials.find((m) => m.id === id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!stoNumber.trim()) {
      setError("STO number is required.");
      return;
    }

    const validItems = items.filter((i) => i.materialId && i.quantity > 0);
    if (!validItems.length) {
      setError("Add at least one item.");
      return;
    }

    const fd = new FormData();
    fd.set("warehouseId", warehouseId);
    fd.set("stoNumber", stoNumber.trim().toUpperCase());
    fd.set("deliveredAt", deliveredAt);
    fd.set("supplier", supplier);
    fd.set("referenceDocument", referenceDocument);
    fd.set("notes", notes);
    fd.set("items", JSON.stringify(validItems));

    startTransition(async () => {
      const result = await receiveStockAction(fd);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(
          `✅ Received! Transaction: ${result.transactionNumber} | STO: ${stoNumber.trim().toUpperCase()}`
        );
        setItems([
          { materialId: "", quantity: 1, batchNumber: "", serialNumbers: "" },
        ]);
        setStoNumber("");
        setSupplier("");
        setReferenceDocument("");
        setNotes("");
        setDeliveredAt(todayLocal());
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Delivery Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              STO Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={stoNumber}
              onChange={(e) => setStoNumber(e.target.value)}
              placeholder="e.g. STO-2026-001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder:normal-case"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              IPG-assigned Stock Transfer Order number
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <Input
            label="Supplier / Source"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. IPG Logistics"
          />
          <Input
            label="Reference Document (DR/PO/SI)"
            value={referenceDocument}
            onChange={(e) => setReferenceDocument(e.target.value)}
            placeholder="e.g. DR-2026-001"
          />
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condition, remarks..."
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Materials Received</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>

        {items.map((item, i) => {
          const mat = getMaterial(item.materialId);
          return (
            <div
              key={i}
              className="border border-gray-200 rounded-lg p-3 space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Material
                    </label>
                    <select
                      value={item.materialId}
                      onChange={(e) =>
                        updateItem(i, "materialId", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select material...</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.code}] {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity {mat ? `(${mat.unit})` : ""}
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          i,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {mat?.requiresBatch && (
                    <Input
                      label="Batch/Lot Number"
                      value={item.batchNumber}
                      onChange={(e) =>
                        updateItem(i, "batchNumber", e.target.value)
                      }
                      placeholder="Batch number"
                    />
                  )}
                  {mat?.requiresSerial && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Serial Numbers (one per line)
                      </label>
                      <textarea
                        value={item.serialNumbers}
                        onChange={(e) =>
                          updateItem(i, "serialNumbers", e.target.value)
                        }
                        rows={4}
                        placeholder={"SN001\nSN002\nSN003"}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {
                          item.serialNumbers
                            .split("\n")
                            .filter((s) => s.trim()).length
                        }{" "}
                        serial(s) entered
                      </p>
                    </div>
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          Confirm Receiving
        </Button>
      </div>
    </form>
  );
}
