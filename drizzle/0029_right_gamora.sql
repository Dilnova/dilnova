ALTER TABLE "meta_catalog_integrations" ADD COLUMN "pinterest_access_token" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "pinterest_board_id" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "pinterest_board_name" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "auto_post_pinterest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "google_merchant_id" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "google_feed_token" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "auto_sync_google" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_quantity_non_negative" CHECK ("inventory"."quantity" >= 0);--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_preordered_quantity_non_negative" CHECK ("inventory"."preordered_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_incoming_quantity_non_negative" CHECK ("inventory"."incoming_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_quantity_on_hand_non_negative" CHECK ("inventory_balances"."quantity_on_hand" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_allocated_quantity_non_negative" CHECK ("inventory_balances"."allocated_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_quantity_non_negative" CHECK ("branch_inventory"."quantity" >= 0);