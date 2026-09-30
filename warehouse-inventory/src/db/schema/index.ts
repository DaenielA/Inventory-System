import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
  decimal,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "WAREHOUSE_CUSTODIAN",
  "TECHNICIAN",
  "VIEWER",
]);

export const inventoryStatusEnum = pgEnum("inventory_status", [
  "AVAILABLE",
  "RESERVED",
  "ISSUED",
  "WITH_TECHNICIAN",
  "INSTALLED",
  "CONSUMED",
  "RETURNED_GOOD",
  "RETURNED_DEFECTIVE",
  "FOR_INSPECTION",
  "DEFECTIVE",
  "FOR_REPAIR",
  "SCRAPPED",
  "LOST",
  "TRANSFERRED",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "RECEIVE",
  "ISSUE",
  "RETURN",
  "CONSUME",
  "INSTALL",
  "PULLOUT",
  "TRANSFER",
  "ADJUST",
  "SCRAP",
  "INSPECT",
]);

export const unitOfMeasureEnum = pgEnum("unit_of_measure", [
  "PCS",
  "METERS",
  "ROLLS",
  "BOXES",
  "SETS",
  "PAIRS",
  "LITERS",
  "KG",
]);

export const workOrderStatusEnum = pgEnum("work_order_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
]);

export const workOrderTypeEnum = pgEnum("work_order_type", [
  "INSTALLATION",
  "REPAIR",
  "PULLOUT",
  "UPGRADE",
  "OTHER",
]);

export const defectiveDispositionEnum = pgEnum("defective_disposition", [
  "PENDING",
  "RETURNED_TO_STOCK",
  "FOR_REPAIR",
  "REPLACED",
  "VENDOR_RETURN",
  "SCRAPPED",
  "UNDER_INVESTIGATION",
]);

export const returnReasonEnum = pgEnum("return_reason", [
  "UNUSED",
  "DEFECTIVE",
  "WRONG_ITEM",
  "EXCESS",
  "JOB_CANCELLED",
  "OTHER",
]);

export const pulloutReasonEnum = pgEnum("pullout_reason", [
  "DEFECTIVE",
  "VENDOR_RETURN",
  "REPLACEMENT",
  "TRANSFER",
  "INVESTIGATION",
  "REPAIR",
  "DISPOSAL",
  "OTHER",
]);

// ─── Users & Auth ─────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("VIEWER"),
    technicianId: uuid("technician_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

// ─── Technicians ──────────────────────────────────────────────────────────────

export const technicians = pgTable(
  "technicians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: text("employee_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    team: text("team"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("technicians_employee_id_idx").on(t.employeeId)]
);

// ─── Warehouses & Locations ───────────────────────────────────────────────────

export const warehouses = pgTable("warehouses", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Material Categories ──────────────────────────────────────────────────────

export const materialCategories = pgTable("material_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Materials (Master) ───────────────────────────────────────────────────────

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: uuid("category_id").references(() => materialCategories.id),
    unit: unitOfMeasureEnum("unit").notNull().default("PCS"),
    brand: text("brand"),
    model: text("model"),
    requiresSerial: boolean("requires_serial").notNull().default(false),
    requiresBatch: boolean("requires_batch").notNull().default(false),
    minStock: integer("min_stock").notNull().default(0),
    maxStock: integer("max_stock"),
    reorderLevel: integer("reorder_level").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("materials_code_idx").on(t.code)]
);

// ─── Material Serials (individual asset tracking) ─────────────────────────────

export const materialSerials = pgTable(
  "material_serials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    serialNumber: text("serial_number").notNull(),
    status: inventoryStatusEnum("status").notNull().default("AVAILABLE"),
    currentTechnicianId: uuid("current_technician_id").references(
      () => technicians.id
    ),
    currentWorkOrderId: uuid("current_work_order_id"),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    locationId: uuid("location_id").references(() => locations.id),
    // STO number from IPG delivery document — links this SN to its batch
    stoNumber: text("sto_number"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("material_serials_serial_idx").on(t.serialNumber),
    index("material_serials_material_idx").on(t.materialId),
    index("material_serials_status_idx").on(t.status),
    index("material_serials_sto_idx").on(t.stoNumber),
  ]
);

// ─── Work Orders ──────────────────────────────────────────────────────────────

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    joNumber: text("jo_number").notNull(),
    technicianId: uuid("technician_id").references(() => technicians.id),
    type: workOrderTypeEnum("type").notNull().default("INSTALLATION"),
    status: workOrderStatusEnum("status").notNull().default("PENDING"),
    customerReference: text("customer_reference"),
    address: text("address"),
    scheduledDate: timestamp("scheduled_date"),
    completedDate: timestamp("completed_date"),
    remarks: text("remarks"),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("work_orders_jo_number_idx").on(t.joNumber),
    index("work_orders_technician_idx").on(t.technicianId),
    index("work_orders_status_idx").on(t.status),
  ]
);

// ─── Inventory Transactions (the ledger) ──────────────────────────────────────

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionNumber: text("transaction_number").notNull().unique(),
    type: transactionTypeEnum("type").notNull(),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    technicianId: uuid("technician_id").references(() => technicians.id),
    workOrderId: uuid("work_order_id").references(() => workOrders.id),
    referenceDocument: text("reference_document"),
    notes: text("notes"),
    performedById: uuid("performed_by_id")
      .notNull()
      .references(() => users.id),
    transactedAt: timestamp("transacted_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("inv_tx_type_idx").on(t.type),
    index("inv_tx_technician_idx").on(t.technicianId),
    index("inv_tx_work_order_idx").on(t.workOrderId),
    index("inv_tx_date_idx").on(t.transactedAt),
  ]
);

export const inventoryTransactionItems = pgTable(
  "inventory_transaction_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => inventoryTransactions.id),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    serialId: uuid("serial_id").references(() => materialSerials.id),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    quantityDelta: decimal("quantity_delta", {
      precision: 12,
      scale: 3,
    }).notNull(),
    fromStatus: inventoryStatusEnum("from_status"),
    toStatus: inventoryStatusEnum("to_status").notNull(),
    batchNumber: text("batch_number"),
    unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
    notes: text("notes"),
  },
  (t) => [
    index("inv_tx_items_tx_idx").on(t.transactionId),
    index("inv_tx_items_material_idx").on(t.materialId),
    index("inv_tx_items_serial_idx").on(t.serialId),
  ]
);

export const technicianAssignments = pgTable(
  "technician_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueItemId: uuid("issue_item_id")
      .notNull()
      .references(() => inventoryTransactionItems.id),
    technicianId: uuid("technician_id")
      .notNull()
      .references(() => technicians.id),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    serialId: uuid("serial_id").references(() => materialSerials.id),
    serialNumber: text("serial_number"),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    status: text("status").notNull().default("ASSIGNED"),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    statusUpdatedAt: timestamp("status_updated_at").notNull().defaultNow(),
    updatedById: uuid("updated_by_id").references(() => users.id),
  },
  (t) => [
    uniqueIndex("technician_assignments_issue_item_idx").on(t.issueItemId),
    index("technician_assignments_technician_idx").on(t.technicianId),
    index("technician_assignments_serial_number_idx").on(t.serialNumber),
  ]
);

// ─── Stock Deliveries (STO / IPG delivery tracking) ───────────────────────────
// One record per IPG delivery. All SNs received under this delivery share the STO number.

export const stockDeliveries = pgTable(
  "stock_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stoNumber: text("sto_number").notNull(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => inventoryTransactions.id),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    deliveredAt: timestamp("delivered_at").notNull(),
    receivedById: uuid("received_by_id")
      .notNull()
      .references(() => users.id),
    supplier: text("supplier"),
    referenceDocument: text("reference_document"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("stock_deliveries_sto_idx").on(t.stoNumber),
    index("stock_deliveries_date_idx").on(t.deliveredAt),
  ]
);

// ─── Material Issuances ───────────────────────────────────────────────────────

export const materialIssuances = pgTable("material_issuances", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => inventoryTransactions.id),
  issuanceNumber: text("issuance_number").notNull().unique(),
  technicianId: uuid("technician_id")
    .notNull()
    .references(() => technicians.id),
  workOrderId: uuid("work_order_id").references(() => workOrders.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  purpose: text("purpose"),
  issuedById: uuid("issued_by_id")
    .notNull()
    .references(() => users.id),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Material Returns ─────────────────────────────────────────────────────────

export const materialReturns = pgTable("material_returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => inventoryTransactions.id),
  returnNumber: text("return_number").notNull().unique(),
  technicianId: uuid("technician_id")
    .notNull()
    .references(() => technicians.id),
  workOrderId: uuid("work_order_id").references(() => workOrders.id),
  reason: returnReasonEnum("reason").notNull(),
  receivedById: uuid("received_by_id")
    .notNull()
    .references(() => users.id),
  returnedAt: timestamp("returned_at").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Defective Items ──────────────────────────────────────────────────────────

export const defectiveItems = pgTable("defective_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id),
  serialId: uuid("serial_id").references(() => materialSerials.id),
  returnId: uuid("return_id").references(() => materialReturns.id),
  technicianId: uuid("technician_id").references(() => technicians.id),
  workOrderId: uuid("work_order_id").references(() => workOrders.id),
  defectReason: text("defect_reason"),
  defectDescription: text("defect_description"),
  disposition: defectiveDispositionEnum("disposition")
    .notNull()
    .default("PENDING"),
  inspectedById: uuid("inspected_by_id").references(() => users.id),
  inspectedAt: timestamp("inspected_at"),
  inspectionNotes: text("inspection_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Pull-Outs ────────────────────────────────────────────────────────────────

export const pullouts = pgTable("pullouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => inventoryTransactions.id),
  pulloutNumber: text("pullout_number").notNull().unique(),
  reason: pulloutReasonEnum("reason").notNull(),
  destination: text("destination"),
  responsiblePersonId: uuid("responsible_person_id").references(() => users.id),
  approvedById: uuid("approved_by_id").references(() => users.id),
  pulledOutAt: timestamp("pulled_out_at").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Inventory Adjustments ────────────────────────────────────────────────────

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => inventoryTransactions.id),
  adjustmentNumber: text("adjustment_number").notNull().unique(),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id),
  quantityBefore: decimal("quantity_before", {
    precision: 12,
    scale: 3,
  }).notNull(),
  quantityAfter: decimal("quantity_after", {
    precision: 12,
    scale: 3,
  }).notNull(),
  adjustmentReason: text("adjustment_reason").notNull(),
  adjustmentType: text("adjustment_type").notNull(),
  approvedById: uuid("approved_by_id").references(() => users.id),
  adjustedById: uuid("adjusted_by_id")
    .notNull()
    .references(() => users.id),
  adjustedAt: timestamp("adjusted_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Stock Counts ─────────────────────────────────────────────────────────────

export const stockCounts = pgTable("stock_counts", {
  id: uuid("id").primaryKey().defaultRandom(),
  countNumber: text("count_number").notNull().unique(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  status: text("status").notNull().default("OPEN"),
  startedById: uuid("started_by_id")
    .notNull()
    .references(() => users.id),
  completedById: uuid("completed_by_id").references(() => users.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stockCountItems = pgTable("stock_count_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  stockCountId: uuid("stock_count_id")
    .notNull()
    .references(() => stockCounts.id),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id),
  systemQuantity: decimal("system_quantity", {
    precision: 12,
    scale: 3,
  }).notNull(),
  physicalQuantity: decimal("physical_quantity", { precision: 12, scale: 3 }),
  variance: decimal("variance", { precision: 12, scale: 3 }),
  notes: text("notes"),
  countedAt: timestamp("counted_at"),
});

// ─── Attachments ──────────────────────────────────────────────────────────────

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id").references(
      () => inventoryTransactions.id
    ),
    defectiveItemId: uuid("defective_item_id").references(
      () => defectiveItems.id
    ),
    fileName: text("file_name").notNull(),
    fileKey: text("file_key").notNull(),
    fileUrl: text("file_url").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  },
  (t) => [index("attachments_tx_idx").on(t.transactionId)]
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    reason: text("reason"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_user_idx").on(t.userId),
    index("audit_logs_entity_idx").on(t.entity, t.entityId),
    index("audit_logs_created_idx").on(t.createdAt),
  ]
);

// ─── System Settings ──────────────────────────────────────────────────────────

export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedById: uuid("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one }) => ({
  technician: one(technicians, {
    fields: [users.technicianId],
    references: [technicians.id],
  }),
}));

export const techniciansRelations = relations(technicians, ({ many }) => ({
  issuances: many(materialIssuances),
  returns: many(materialReturns),
  workOrders: many(workOrders),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  category: one(materialCategories, {
    fields: [materials.categoryId],
    references: [materialCategories.id],
  }),
  serials: many(materialSerials),
}));

export const inventoryTransactionsRelations = relations(
  inventoryTransactions,
  ({ one, many }) => ({
    items: many(inventoryTransactionItems),
    delivery: one(stockDeliveries, {
      fields: [inventoryTransactions.id],
      references: [stockDeliveries.transactionId],
    }),
    performedBy: one(users, {
      fields: [inventoryTransactions.performedById],
      references: [users.id],
    }),
    technician: one(technicians, {
      fields: [inventoryTransactions.technicianId],
      references: [technicians.id],
    }),
    workOrder: one(workOrders, {
      fields: [inventoryTransactions.workOrderId],
      references: [workOrders.id],
    }),
    attachments: many(attachments),
  })
);

export const inventoryTransactionItemsRelations = relations(
  inventoryTransactionItems,
  ({ one }) => ({
    transaction: one(inventoryTransactions, {
      fields: [inventoryTransactionItems.transactionId],
      references: [inventoryTransactions.id],
    }),
    material: one(materials, {
      fields: [inventoryTransactionItems.materialId],
      references: [materials.id],
    }),
    serial: one(materialSerials, {
      fields: [inventoryTransactionItems.serialId],
      references: [materialSerials.id],
    }),
  })
);

export const stockDeliveriesRelations = relations(stockDeliveries, ({ one }) => ({
  transaction: one(inventoryTransactions, {
    fields: [stockDeliveries.transactionId],
    references: [inventoryTransactions.id],
  }),
  receivedBy: one(users, {
    fields: [stockDeliveries.receivedById],
    references: [users.id],
  }),
}));
