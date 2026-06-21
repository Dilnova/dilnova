CREATE TABLE "billing_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"org_id" text NOT NULL,
	"cashier_user_id" text NOT NULL,
	"total_amount" integer NOT NULL,
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"customer_name" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"bin_location" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branch_inventory_branch_product_unique" UNIQUE("branch_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "branch_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"member_user_id" text NOT NULL,
	"role" text DEFAULT 'cashier' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branch_members_branch_user_unique" UNIQUE("branch_id","member_user_id")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_receipt_items" ADD CONSTRAINT "billing_receipt_items_receipt_id_billing_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."billing_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_receipt_items" ADD CONSTRAINT "billing_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_receipts" ADD CONSTRAINT "billing_receipts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_members" ADD CONSTRAINT "branch_members_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_billing_receipt_items_receipt_id" ON "billing_receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "idx_billing_receipt_items_product_id" ON "billing_receipt_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_branch_id" ON "billing_receipts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_org_id" ON "billing_receipts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_cashier" ON "billing_receipts" USING btree ("cashier_user_id");--> statement-breakpoint
CREATE INDEX "idx_billing_receipts_created_at" ON "billing_receipts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_branch_inventory_branch_id" ON "branch_inventory" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_branch_inventory_product_id" ON "branch_inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_branch_members_branch_id" ON "branch_members" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_branch_members_user_id" ON "branch_members" USING btree ("member_user_id");--> statement-breakpoint
CREATE INDEX "idx_branches_org_id" ON "branches" USING btree ("org_id");