CREATE TABLE "processed_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'clerk' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_processed_webhooks_created_at" ON "processed_webhooks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_default_branch" ON "branches" USING btree ("org_id") WHERE is_default = true;