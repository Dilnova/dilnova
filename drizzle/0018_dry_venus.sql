CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" real NOT NULL,
	"provider" text DEFAULT 'ecb' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_settings" (
	"org_id" text PRIMARY KEY NOT NULL,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"fx_markup_percent" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD COLUMN "vendor_base_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD COLUMN "unit_price_base" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD COLUMN "exchange_rate_snapshot" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "presentment_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "vendor_base_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "exchange_rate" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "base_subtotal_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "base_tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "base_shipping_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "base_total_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_pair" ON "exchange_rates" USING btree ("from_currency","to_currency");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_updated_at" ON "exchange_rates" USING btree ("updated_at");