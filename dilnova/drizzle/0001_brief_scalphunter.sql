CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"bin_location" text,
	"supplier_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity_changed" integer NOT NULL,
	"previous_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"reason" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" text NOT NULL,
	"period" text DEFAULT '/month' NOT NULL,
	"description" text,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"button_text" text DEFAULT 'Get Started' NOT NULL,
	"button_link" text DEFAULT '/contact' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulated_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"vendor_org_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulated_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"total_amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD CONSTRAINT "simulated_order_items_order_id_simulated_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."simulated_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD CONSTRAINT "simulated_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_submissions_email" ON "contact_submissions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_contact_submissions_status" ON "contact_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inventory_product_id" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_supplier_id" ON "inventory" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_sku" ON "inventory" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_inventory_id" ON "inventory_movements" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_type" ON "inventory_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_created_at" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_simulated_order_items_order_id" ON "simulated_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_simulated_order_items_product_id" ON "simulated_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_simulated_orders_status" ON "simulated_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_simulated_orders_created_at" ON "simulated_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_simulated_orders_email" ON "simulated_orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_id" ON "suppliers" USING btree ("org_id");