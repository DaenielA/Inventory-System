"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createMaterialAction, updateMaterialAction } from "./actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Category { id: string; code: string; name: string; }

interface MaterialFormProps {
  categories: Category[];
  initial?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    unit: string;
    brand: string | null;
    model: string | null;
    requiresSerial: boolean;
    minStock: number;
    reorderLevel: number;
    maxStock: number | null;
  };
}

const UNITS = ["PCS", "ROLLS", "METERS", "BOXES", "SETS", "PAIRS", "LITERS", "KG"] as const;

export function MaterialForm({ categories, initial }: MaterialFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [code, setCode]                   = useState(initial?.code ?? "");
  const [name, setName]                   = useState(initial?.name ?? "");
  const [description, setDescription]     = useState(initial?.description ?? "");
  const [categoryId, setCategoryId]       = useState(initial?.categoryId ?? "");
  const [unit, setUnit]                   = useState(initial?.unit ?? "PCS");
  const [brand, setBrand]                 = useState(initial?.brand ?? "");
  const [model, setModel]                 = useState(initial?.model ?? "");
  const [requiresSerial, setRequiresSerial] = useState(initial?.requiresSerial ?? true);
  const [minStock, setMinStock]           = useState(String(initial?.minStock ?? 0));
  const [reorderLevel, setReorderLevel]   = useState(String(initial?.reorderLevel ?? 0));
  const [maxStock, setMaxStock]           = useState(String(initial?.maxStock ?? ""));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const fd = new FormData();
    fd.set("code",           code.trim().toUpperCase());
    fd.set("name",           name.trim());
    fd.set("description",    description.trim());
    fd.set("categoryId",     categoryId);
    fd.set("unit",           unit);
    fd.set("brand",          brand.trim());
    fd.set("model",          model.trim());
    fd.set("requiresSerial", String(requiresSerial));
    fd.set("minStock",       minStock);
    fd.set("reorderLevel",   reorderLevel);
    fd.set("maxStock",       maxStock);

    startTransition(async () => {
      const result = initial
        ? await updateMaterialAction(initial.id, fd)
        : await createMaterialAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  const isEdit = !!initial;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/materials" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Material" : "Register New Material"}
          </h2>
          <p className="text-sm text-gray-500">
            {isEdit ? `Editing ${initial.code}` : "Add a new material from IPG master list"}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card className="p-5 space-y-5">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Material Identity</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Matcode (IPG-assigned) *"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. MDM-ZTE-PREPAID"
            required
            className="font-mono"
          />
          <Input
            label="Material Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ZTE Prepaid Modem F670L"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brand, model details, specs, or any notes from IPG..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. ZTE, Huawei, TP-Link"
          />
          <Input
            label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. F670L, HG8145V5"
          />
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Classification</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure *</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number Tracking *</label>
          <div className="flex gap-4">
            {[
              { value: true,  label: "Yes — track by SN",        hint: "Modems, cables, CCTV, telset" },
              { value: false, label: "No — track by quantity",   hint: "FIC, cable ties, batteries" },
            ].map((opt) => (
              <label
                key={String(opt.value)}
                className={`flex-1 flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  requiresSerial === opt.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="requiresSerial"
                  checked={requiresSerial === opt.value}
                  onChange={() => setRequiresSerial(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.hint}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Stock Thresholds</h3>
        <p className="text-xs text-gray-500">Used for low stock alerts. Leave at 0 if not applicable.</p>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Min Stock"
            type="number"
            min="0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
          <Input
            label="Reorder Level"
            type="number"
            min="0"
            value={reorderLevel}
            onChange={(e) => setReorderLevel(e.target.value)}
          />
          <Input
            label="Max Stock"
            type="number"
            min="0"
            value={maxStock}
            onChange={(e) => setMaxStock(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          {isEdit ? "Save Changes" : "Register Material"}
        </Button>
      </div>
    </form>
  );
}
