import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  // Admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const [admin] = await db
    .insert(schema.users)
    .values({
      name: "System Administrator",
      email: "admin@warehouse.local",
      passwordHash,
      role: "ADMIN",
    })
    .onConflictDoNothing()
    .returning();
  console.log("✅ Admin user created:", admin?.email ?? "already exists");

  // Custodian user
  const custodianHash = await bcrypt.hash("custodian123", 12);
  await db
    .insert(schema.users)
    .values({
      name: "Warehouse Custodian",
      email: "custodian@warehouse.local",
      passwordHash: custodianHash,
      role: "WAREHOUSE_CUSTODIAN",
    })
    .onConflictDoNothing();
  console.log("✅ Custodian user created");

  // Default warehouse
  let [warehouse] = await db
    .insert(schema.warehouses)
    .values({
      code: "WH-MAIN",
      name: "Main Warehouse",
      address: "Main Office",
    })
    .onConflictDoNothing()
    .returning();
  if (!warehouse) {
    [warehouse] = await db
      .select()
      .from(schema.warehouses)
      .where(eq(schema.warehouses.code, "WH-MAIN"))
      .limit(1);
  }
  console.log("✅ Warehouse:", warehouse.code);

  // Warehouse locations
  await db
    .insert(schema.locations)
    .values([
      {
        warehouseId: warehouse.id,
        code: "LOC-A1",
        name: "Shelf A1",
        description: "ONT/ONU Equipment",
      },
      {
        warehouseId: warehouse.id,
        code: "LOC-A2",
        name: "Shelf A2",
        description: "Cables and Wires",
      },
      {
        warehouseId: warehouse.id,
        code: "LOC-B1",
        name: "Shelf B1",
        description: "Connectors and Accessories",
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Locations created");

  // Material categories
  const categories = await db
    .insert(schema.materialCategories)
    .values([
      { code: "CAT-MODEM",   name: "Modems",           description: "Prepaid and postpaid WiFi modems" },
      { code: "CAT-CABLE",   name: "Fiber Drop Cable",  description: "Regular and preterm fiberdrop rolls" },
      { code: "CAT-CONN",    name: "Connectors",        description: "Field installable connectors (FIC)" },
      { code: "CAT-TELSET",  name: "Telephone Sets",    description: "Landline telephone sets" },
      { code: "CAT-CCTV",    name: "CCTV Equipment",    description: "CCTV cameras and accessories" },
      { code: "CAT-MISC",    name: "Miscellaneous",     description: "Cable ties, batteries, and other consumables" },
    ])
    .onConflictDoNothing()
    .returning();
  console.log("✅ Categories created");

  const catMap = Object.fromEntries(categories.map((c) => [c.code, c.id]));

  // ── Actual inventory materials ──────────────────────────────────────────────
  await db
    .insert(schema.materials)
    .values([
      // ── Fiber Drop Cables (each roll = 1 PCS, tracked by serial/matcode) ──
      {
        code: "FDC-REG-1000",
        name: "Fiberdrop Cable Regular 1000m",
        description: "Regular fiberdrop roll, 1000 meters per roll",
        categoryId: catMap["CAT-CABLE"],
        unit: "ROLLS",
        requiresSerial: true,
        minStock: 1,
        reorderLevel: 2,
        maxStock: 20,
      },
      {
        code: "FDC-PRE-100",
        name: "Fiberdrop Cable Preterm 100m",
        description: "Preterminated fiberdrop roll, 100 meters",
        categoryId: catMap["CAT-CABLE"],
        unit: "ROLLS",
        requiresSerial: true,
        minStock: 2,
        reorderLevel: 5,
        maxStock: 50,
      },
      {
        code: "FDC-PRE-200",
        name: "Fiberdrop Cable Preterm 200m",
        description: "Preterminated fiberdrop roll, 200 meters",
        categoryId: catMap["CAT-CABLE"],
        unit: "ROLLS",
        requiresSerial: true,
        minStock: 2,
        reorderLevel: 5,
        maxStock: 50,
      },
      {
        code: "FDC-PRE-300",
        name: "Fiberdrop Cable Preterm 300m",
        description: "Preterminated fiberdrop roll, 300 meters",
        categoryId: catMap["CAT-CABLE"],
        unit: "ROLLS",
        requiresSerial: true,
        minStock: 2,
        reorderLevel: 5,
        maxStock: 50,
      },

      // ── Modems (serialized) ────────────────────────────────────────────────
      {
        code: "MDM-PREPAID",
        name: "Modem Prepaid",
        description: "Prepaid WiFi modem",
        categoryId: catMap["CAT-MODEM"],
        unit: "PCS",
        requiresSerial: true,
        minStock: 5,
        reorderLevel: 10,
        maxStock: 100,
      },
      {
        code: "MDM-POSTPAID",
        name: "Modem Postpaid",
        description: "Postpaid WiFi modem",
        categoryId: catMap["CAT-MODEM"],
        unit: "PCS",
        requiresSerial: true,
        minStock: 5,
        reorderLevel: 10,
        maxStock: 100,
      },

      // ── Telephone Set (serialized) ─────────────────────────────────────────
      {
        code: "TEL-SET-001",
        name: "Telephone Set",
        description: "Landline telephone set",
        categoryId: catMap["CAT-TELSET"],
        unit: "PCS",
        requiresSerial: true,
        minStock: 2,
        reorderLevel: 5,
        maxStock: 50,
      },

      // ── FIC — Field Installable Connector (qty only, uses matcode) ─────────
      {
        code: "FIC-SCAPC",
        name: "FIC SC/APC",
        description: "Field Installable Connector SC/APC — connects fiber to NAP box",
        categoryId: catMap["CAT-CONN"],
        unit: "PCS",
        requiresSerial: false,
        minStock: 20,
        reorderLevel: 50,
        maxStock: 500,
      },
      {
        code: "FIC-SCUPC",
        name: "FIC SC/UPC",
        description: "Field Installable Connector SC/UPC",
        categoryId: catMap["CAT-CONN"],
        unit: "PCS",
        requiresSerial: false,
        minStock: 20,
        reorderLevel: 50,
        maxStock: 500,
      },

      // ── CCTV (serialized) ──────────────────────────────────────────────────
      {
        code: "CCTV-CAM-BULLET",
        name: "CCTV Bullet Camera",
        description: "Outdoor bullet CCTV camera",
        categoryId: catMap["CAT-CCTV"],
        unit: "PCS",
        requiresSerial: true,
        minStock: 2,
        reorderLevel: 5,
        maxStock: 50,
      },
      {
        code: "CCTV-CAM-DOME",
        name: "CCTV Dome Camera",
        description: "Indoor dome CCTV camera",
        categoryId: catMap["CAT-CCTV"],
        unit: "PCS",
        requiresSerial: true,
        minStock: 2,
        reorderLevel: 5,
        maxStock: 50,
      },
      {
        code: "CCTV-DVR",
        name: "CCTV DVR",
        description: "Digital video recorder for CCTV",
        categoryId: catMap["CAT-CCTV"],
        unit: "PCS",
        requiresSerial: true,
        minStock: 1,
        reorderLevel: 2,
        maxStock: 20,
      },
      {
        code: "CCTV-NVR",
        name: "CCTV NVR",
        description: "Network video recorder for IP CCTV",
        categoryId: catMap["CAT-CCTV"],
        unit: "PCS",
        requiresSerial: true,
        minStock: 1,
        reorderLevel: 2,
        maxStock: 20,
      },

      // ── Consumables (qty only) ─────────────────────────────────────────────
      {
        code: "MISC-CTIE",
        name: "Cable Tie",
        description: "Nylon cable ties (per pack)",
        categoryId: catMap["CAT-MISC"],
        unit: "PCS",
        requiresSerial: false,
        minStock: 10,
        reorderLevel: 20,
        maxStock: 200,
      },
      {
        code: "MISC-BATT-AA",
        name: "Battery AA",
        description: "AA alkaline batteries (per pack)",
        categoryId: catMap["CAT-MISC"],
        unit: "PCS",
        requiresSerial: false,
        minStock: 5,
        reorderLevel: 10,
        maxStock: 100,
      },
      {
        code: "MISC-BATT-AAA",
        name: "Battery AAA",
        description: "AAA alkaline batteries (per pack)",
        categoryId: catMap["CAT-MISC"],
        unit: "PCS",
        requiresSerial: false,
        minStock: 5,
        reorderLevel: 10,
        maxStock: 100,
      },
    ])
    .onConflictDoNothing();
  console.log("✅ Materials created");

  // Sample technicians
  await db
    .insert(schema.technicians)
    .values([
      { employeeId: "TECH-001", name: "Juan Dela Cruz", phone: "09171234567", team: "Team A" },
      { employeeId: "TECH-002", name: "Pedro Santos", phone: "09181234567", team: "Team A" },
      { employeeId: "TECH-003", name: "Maria Reyes", phone: "09191234567", team: "Team B" },
    ])
    .onConflictDoNothing();
  console.log("✅ Technicians created");

  // System settings
  await db
    .insert(schema.systemSettings)
    .values([
      { key: "company_name", value: "Globe AT HOME Contractor", description: "Company name shown in reports" },
      { key: "warehouse_name", value: "Main Warehouse", description: "Default warehouse name" },
      { key: "low_stock_alert", value: "true", description: "Enable low stock alerts" },
      { key: "outstanding_alert_days", value: "3", description: "Days before outstanding material alert" },
    ])
    .onConflictDoNothing();
  console.log("✅ System settings created");

  console.log("\n✅ Seed complete!");
  console.log("   Admin login: admin@warehouse.local / admin123");
  console.log("   Custodian login: custodian@warehouse.local / custodian123");

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
