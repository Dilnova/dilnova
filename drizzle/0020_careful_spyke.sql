CREATE TABLE "product_waitlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"email" text NOT NULL,
	"email_hash" text,
	"user_id" text,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_waitlist_product_email_unique" UNIQUE("product_id","email_hash")
);
--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "default_tax_class_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tax_class_id" uuid;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD COLUMN "tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD COLUMN "tax_rate_percent" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_order_items" ADD COLUMN "tax_class_code" text;--> statement-breakpoint
ALTER TABLE "billing_receipt_items" ADD COLUMN "tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_receipt_items" ADD COLUMN "tax_rate_percent" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_receipt_items" ADD COLUMN "tax_class_code" text;--> statement-breakpoint
ALTER TABLE "billing_receipts" ADD COLUMN "subtotal_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_receipts" ADD COLUMN "tax_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_waitlists" ADD CONSTRAINT "product_waitlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_waitlists_product_id" ON "product_waitlists" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_waitlists_email_hash" ON "product_waitlists" USING btree ("email_hash");--> statement-breakpoint
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_default_tax_class_id_tax_classes_id_fk" FOREIGN KEY ("default_tax_class_id") REFERENCES "public"."tax_classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tax_class_id_tax_classes_id_fk" FOREIGN KEY ("tax_class_id") REFERENCES "public"."tax_classes"("id") ON DELETE set null ON UPDATE no action;