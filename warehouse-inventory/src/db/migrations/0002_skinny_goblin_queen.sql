CREATE TABLE "technician_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_item_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"serial_id" uuid,
	"serial_number" text,
	"warehouse_id" uuid,
	"quantity" numeric(12, 3) NOT NULL,
	"status" text DEFAULT 'ASSIGNED' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"status_updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_id" uuid
);
--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_issue_item_id_inventory_transaction_items_id_fk" FOREIGN KEY ("issue_item_id") REFERENCES "public"."inventory_transaction_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_serial_id_material_serials_id_fk" FOREIGN KEY ("serial_id") REFERENCES "public"."material_serials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_assignments" ADD CONSTRAINT "technician_assignments_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "technician_assignments_issue_item_idx" ON "technician_assignments" USING btree ("issue_item_id");--> statement-breakpoint
CREATE INDEX "technician_assignments_technician_idx" ON "technician_assignments" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "technician_assignments_serial_number_idx" ON "technician_assignments" USING btree ("serial_number");