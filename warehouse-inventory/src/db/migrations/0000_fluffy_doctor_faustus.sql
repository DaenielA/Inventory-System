CREATE TYPE "public"."defective_disposition" AS ENUM('PENDING', 'RETURNED_TO_STOCK', 'FOR_REPAIR', 'REPLACED', 'VENDOR_RETURN', 'SCRAPPED', 'UNDER_INVESTIGATION');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('AVAILABLE', 'RESERVED', 'ISSUED', 'WITH_TECHNICIAN', 'INSTALLED', 'CONSUMED', 'RETURNED_GOOD', 'RETURNED_DEFECTIVE', 'FOR_INSPECTION', 'DEFECTIVE', 'FOR_REPAIR', 'SCRAPPED', 'LOST', 'TRANSFERRED');--> statement-breakpoint
CREATE TYPE "public"."pullout_reason" AS ENUM('DEFECTIVE', 'VENDOR_RETURN', 'REPLACEMENT', 'TRANSFER', 'INVESTIGATION', 'REPAIR', 'DISPOSAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."return_reason" AS ENUM('UNUSED', 'DEFECTIVE', 'WRONG_ITEM', 'EXCESS', 'JOB_CANCELLED', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('RECEIVE', 'ISSUE', 'RETURN', 'CONSUME', 'INSTALL', 'PULLOUT', 'TRANSFER', 'ADJUST', 'SCRAP', 'INSPECT');--> statement-breakpoint
CREATE TYPE "public"."unit_of_measure" AS ENUM('PCS', 'METERS', 'ROLLS', 'BOXES', 'SETS', 'PAIRS', 'LITERS', 'KG');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'WAREHOUSE_CUSTODIAN', 'TECHNICIAN', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."work_order_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');--> statement-breakpoint
CREATE TYPE "public"."work_order_type" AS ENUM('INSTALLATION', 'REPAIR', 'PULLOUT', 'UPGRADE', 'OTHER');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid,
	"defective_item_id" uuid,
	"file_name" text NOT NULL,
	"file_key" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "defective_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"serial_id" uuid,
	"return_id" uuid,
	"technician_id" uuid,
	"work_order_id" uuid,
	"defect_reason" text,
	"defect_description" text,
	"disposition" "defective_disposition" DEFAULT 'PENDING' NOT NULL,
	"inspected_by_id" uuid,
	"inspected_at" timestamp,
	"inspection_notes" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"adjustment_number" text NOT NULL,
	"material_id" uuid NOT NULL,
	"quantity_before" numeric(12, 3) NOT NULL,
	"quantity_after" numeric(12, 3) NOT NULL,
	"adjustment_reason" text NOT NULL,
	"adjustment_type" text NOT NULL,
	"approved_by_id" uuid,
	"adjusted_by_id" uuid NOT NULL,
	"adjusted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_adjustments_adjustment_number_unique" UNIQUE("adjustment_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_transaction_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"serial_id" uuid,
	"quantity" numeric(12, 3) NOT NULL,
	"quantity_delta" numeric(12, 3) NOT NULL,
	"from_status" "inventory_status",
	"to_status" "inventory_status" NOT NULL,
	"batch_number" text,
	"unit_cost" numeric(12, 4),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_number" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"warehouse_id" uuid,
	"technician_id" uuid,
	"work_order_id" uuid,
	"reference_document" text,
	"notes" text,
	"performed_by_id" uuid NOT NULL,
	"transacted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_transactions_transaction_number_unique" UNIQUE("transaction_number")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "material_issuances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"issuance_number" text NOT NULL,
	"technician_id" uuid NOT NULL,
	"work_order_id" uuid,
	"warehouse_id" uuid,
	"purpose" text,
	"issued_by_id" uuid NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_issuances_issuance_number_unique" UNIQUE("issuance_number")
);
--> statement-breakpoint
CREATE TABLE "material_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"return_number" text NOT NULL,
	"technician_id" uuid NOT NULL,
	"work_order_id" uuid,
	"reason" "return_reason" NOT NULL,
	"received_by_id" uuid NOT NULL,
	"returned_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "material_returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE "material_serials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"serial_number" text NOT NULL,
	"status" "inventory_status" DEFAULT 'AVAILABLE' NOT NULL,
	"current_technician_id" uuid,
	"current_work_order_id" uuid,
	"warehouse_id" uuid,
	"location_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"unit" "unit_of_measure" DEFAULT 'PCS' NOT NULL,
	"brand" text,
	"model" text,
	"requires_serial" boolean DEFAULT false NOT NULL,
	"requires_batch" boolean DEFAULT false NOT NULL,
	"min_stock" integer DEFAULT 0 NOT NULL,
	"max_stock" integer,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pullouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"pullout_number" text NOT NULL,
	"reason" "pullout_reason" NOT NULL,
	"destination" text,
	"responsible_person_id" uuid,
	"approved_by_id" uuid,
	"pulled_out_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pullouts_pullout_number_unique" UNIQUE("pullout_number")
);
--> statement-breakpoint
CREATE TABLE "stock_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_count_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"system_quantity" numeric(12, 3) NOT NULL,
	"physical_quantity" numeric(12, 3),
	"variance" numeric(12, 3),
	"notes" text,
	"counted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_number" text NOT NULL,
	"warehouse_id" uuid,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"started_by_id" uuid NOT NULL,
	"completed_by_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_counts_count_number_unique" UNIQUE("count_number")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"team" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'VIEWER' NOT NULL,
	"technician_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jo_number" text NOT NULL,
	"technician_id" uuid,
	"type" "work_order_type" DEFAULT 'INSTALLATION' NOT NULL,
	"status" "work_order_status" DEFAULT 'PENDING' NOT NULL,
	"customer_reference" text,
	"address" text,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"remarks" text,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_defective_item_id_defective_items_id_fk" FOREIGN KEY ("defective_item_id") REFERENCES "public"."defective_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defective_items" ADD CONSTRAINT "defective_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defective_items" ADD CONSTRAINT "defective_items_serial_id_material_serials_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."material_serials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defective_items" ADD CONSTRAINT "defective_items_return_id_material_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."material_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defective_items" ADD CONSTRAINT "defective_items_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defective_items" ADD CONSTRAINT "defective_items_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defective_items" ADD CONSTRAINT "defective_items_inspected_by_id_users_id_fk" FOREIGN KEY ("inspected_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_adjusted_by_id_users_id_fk" FOREIGN KEY ("adjusted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction_items" ADD CONSTRAINT "inventory_transaction_items_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction_items" ADD CONSTRAINT "inventory_transaction_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction_items" ADD CONSTRAINT "inventory_transaction_items_serial_id_material_serials_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."material_serials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issuances" ADD CONSTRAINT "material_issuances_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issuances" ADD CONSTRAINT "material_issuances_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issuances" ADD CONSTRAINT "material_issuances_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issuances" ADD CONSTRAINT "material_issuances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issuances" ADD CONSTRAINT "material_issuances_issued_by_id_users_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_returns" ADD CONSTRAINT "material_returns_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_serials" ADD CONSTRAINT "material_serials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_serials" ADD CONSTRAINT "material_serials_current_technician_id_technicians_id_fk" FOREIGN KEY ("current_technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_serials" ADD CONSTRAINT "material_serials_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_serials" ADD CONSTRAINT "material_serials_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_material_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pullouts" ADD CONSTRAINT "pullouts_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pullouts" ADD CONSTRAINT "pullouts_responsible_person_id_users_id_fk" FOREIGN KEY ("responsible_person_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pullouts" ADD CONSTRAINT "pullouts_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_stock_count_id_stock_counts_id_fk" FOREIGN KEY ("stock_count_id") REFERENCES "public"."stock_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_started_by_id_users_id_fk" FOREIGN KEY ("started_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_tx_idx" ON "attachments" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inv_tx_items_tx_idx" ON "inventory_transaction_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "inv_tx_items_material_idx" ON "inventory_transaction_items" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "inv_tx_items_serial_idx" ON "inventory_transaction_items" USING btree ("serial_id");--> statement-breakpoint
CREATE INDEX "inv_tx_type_idx" ON "inventory_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "inv_tx_technician_idx" ON "inventory_transactions" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "inv_tx_work_order_idx" ON "inventory_transactions" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "inv_tx_date_idx" ON "inventory_transactions" USING btree ("transacted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "material_serials_serial_idx" ON "material_serials" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "material_serials_material_idx" ON "material_serials" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_serials_status_idx" ON "material_serials" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_code_idx" ON "materials" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "technicians_employee_id_idx" ON "technicians" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "work_orders_jo_number_idx" ON "work_orders" USING btree ("jo_number");--> statement-breakpoint
CREATE INDEX "work_orders_technician_idx" ON "work_orders" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "work_orders_status_idx" ON "work_orders" USING btree ("status");