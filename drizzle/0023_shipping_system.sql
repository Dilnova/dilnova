ALTER TABLE "products" ADD COLUMN "weight_grams" integer;
ALTER TABLE "products" ADD COLUMN "length_cm" real;
ALTER TABLE "products" ADD COLUMN "width_cm" real;
ALTER TABLE "products" ADD COLUMN "height_cm" real;
ALTER TABLE "products" ADD COLUMN "hs_code" text;
ALTER TABLE "products" ADD COLUMN "shipping_class" text DEFAULT 'standard' NOT NULL;
ALTER TABLE "products" ADD COLUMN "requires_signature" boolean DEFAULT false NOT NULL;

ALTER TABLE "simulated_orders" ADD COLUMN "carrier_name" text;
ALTER TABLE "simulated_orders" ADD COLUMN "tracking_number" text;
ALTER TABLE "simulated_orders" ADD COLUMN "tracking_url" text;
ALTER TABLE "simulated_orders" ADD COLUMN "label_url" text;
ALTER TABLE "simulated_orders" ADD COLUMN "shipment_external_id" text;
ALTER TABLE "simulated_orders" ADD COLUMN "shipping_service" text;
ALTER TABLE "simulated_orders" ADD COLUMN "shipping_zone" text;
ALTER TABLE "simulated_orders" ADD COLUMN "estimated_delivery_date" timestamp;
ALTER TABLE "simulated_orders" ADD COLUMN "shipped_at" timestamp;
ALTER TABLE "simulated_orders" ADD COLUMN "delivered_at" timestamp;
ALTER TABLE "simulated_orders" ADD COLUMN "origin_branch_id" uuid;
CREATE INDEX IF NOT EXISTS "idx_simulated_orders_tracking" ON "simulated_orders" USING btree ("tracking_number");

ALTER TABLE "simulated_order_items" ADD COLUMN "item_shipping_amount" integer DEFAULT 0 NOT NULL;
ALTER TABLE "simulated_order_items" ADD COLUMN "item_carrier" text;
ALTER TABLE "simulated_order_items" ADD COLUMN "item_tracking_number" text;

CREATE TABLE IF NOT EXISTS "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"vendor_org_id" text NOT NULL,
	"origin_branch_id" uuid,
	"carrier_name" text NOT NULL,
	"shipment_external_id" text,
	"tracking_number" text,
	"tracking_url" text,
	"label_url" text,
	"status" text DEFAULT 'label_created' NOT NULL,
	"shipping_service" text,
	"shipping_zone" text,
	"rate_amount_cents" integer DEFAULT 0 NOT NULL,
	"weight_grams" integer,
	"estimated_delivery_date" timestamp,
	"delivered_at" timestamp,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_simulated_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."simulated_orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_origin_branch_id_branches_id_fk" FOREIGN KEY ("origin_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_shipments_order_id" ON "shipments" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_shipments_tracking_number" ON "shipments" USING btree ("tracking_number");
CREATE INDEX IF NOT EXISTS "idx_shipments_vendor_org_id" ON "shipments" USING btree ("vendor_org_id");
CREATE INDEX IF NOT EXISTS "idx_shipments_status" ON "shipments" USING btree ("status");

CREATE TABLE IF NOT EXISTS "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"return_label_url" text,
	"return_tracking_number" text,
	"return_carrier" text,
	"refund_amount_cents" integer,
	"vendor_notes" text,
	"customer_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_simulated_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."simulated_orders"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_returns_order_id" ON "returns" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_returns_customer_id" ON "returns" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_returns_status" ON "returns" USING btree ("status");
