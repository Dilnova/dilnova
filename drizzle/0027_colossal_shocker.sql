ALTER TABLE "meta_catalog_integrations" ADD COLUMN "facebook_page_access_token" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "instagram_account_id" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "auto_post_facebook_feed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "auto_post_instagram_feed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "auto_trigger_webhook" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meta_catalog_integrations" ADD COLUMN "custom_post_template" text;