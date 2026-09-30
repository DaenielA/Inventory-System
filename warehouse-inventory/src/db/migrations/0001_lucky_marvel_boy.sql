CREATE TABLE "stock_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sto_number" text NOT NULL,
	"transaction_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"delivered_at" timestamp NOT NULL,
	"received_by_id" uuid NOT NULL,
	"supplier" text,
	"reference_document" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_serials" ADD COLUMN "sto_number" text;--> statement-breakpoint
ALTER TABLE "stock_deliveries" ADD CONSTRAINT "stock_deliveries_transaction_id_inventory_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_deliveries" ADD CONSTRAINT "stock_deliveries_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_deliveries" ADD CONSTRAINT "stock_deliveries_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_deliveries_sto_idx" ON "stock_deliveries" USING btree ("sto_number");--> statement-breakpoint
CREATE INDEX "stock_deliveries_date_idx" ON "stock_deliveries" USING btree ("delivered_at");--> statement-breakpoint
CREATE INDEX "material_serials_sto_idx" ON "material_serials" USING btree ("sto_number");