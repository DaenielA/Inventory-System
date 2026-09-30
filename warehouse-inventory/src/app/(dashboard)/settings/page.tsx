import { requireRole } from "@/lib/authorization";
import { db } from "@/db";
import { systemSettings, warehouses } from "@/db/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  await requireRole("ADMIN");

  const [settings, warehouseList] = await Promise.all([
    db.select().from(systemSettings).orderBy(systemSettings.key),
    db.select().from(warehouses).orderBy(warehouses.name),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">System configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {settings.map((s) => (
              <div key={s.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 font-mono">{s.key}</p>
                  {s.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                  )}
                </div>
                <p className="text-sm text-gray-700 font-medium">{s.value}</p>
              </div>
            ))}
            {settings.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No settings configured.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Warehouses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {warehouseList.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{w.code}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${w.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {w.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
