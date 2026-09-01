CREATE TABLE "meta_catalog_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"catalog_id" text NOT NULL,
	"access_token" text NOT NULL,
	"facebook_page_id" text,
	"business_manager_id" text,
	"brand_name" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"auto_sync_on_create" boolean DEFAULT true NOT NULL,
	"auto_sync_on_update" boolean DEFAULT true NOT NULL,
	"auto_sync_on_delete" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"sync_status" text DEFAULT 'connected' NOT NULL,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meta_catalog_integrations_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "meta_catalog_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"product_id" uuid,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"product_name" text,
	"product_sku" text,
	"meta_batch_handle" text,
	"meta_response" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meta_catalog_sync_logs" ADD CONSTRAINT "meta_catalog_sync_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_meta_catalog_integrations_org_id" ON "meta_catalog_integrations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_meta_catalog_sync_logs_org_id" ON "meta_catalog_sync_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_meta_catalog_sync_logs_created_at" ON "meta_catalog_sync_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_meta_catalog_sync_logs_product_id" ON "meta_catalog_sync_logs" USING btree ("product_id");