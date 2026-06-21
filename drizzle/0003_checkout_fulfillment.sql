ALTER TABLE "simulated_orders" ADD COLUMN "fulfillment_method" text DEFAULT 'standard_delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "payment_method" text DEFAULT 'pay_online' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "pickup_branch_id" uuid;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD CONSTRAINT "simulated_orders_pickup_branch_id_branches_id_fk" FOREIGN KEY ("pickup_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
