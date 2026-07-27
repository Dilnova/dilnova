ALTER TABLE "org_settings" ALTER COLUMN "base_currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "simulated_order_items" ALTER COLUMN "vendor_base_currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "simulated_orders" ALTER COLUMN "presentment_currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "simulated_orders" ALTER COLUMN "vendor_base_currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_preorder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_type" text DEFAULT 'full_upfront' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_deposit_amount" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_release_date" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_max_quantity" integer;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "preordered_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "incoming_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "is_preorder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "preorder_deposit_paid" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "preorder_balance_due" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "preorder_status" text DEFAULT 'none' NOT NULL;