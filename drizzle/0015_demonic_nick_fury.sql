ALTER TABLE "contact_submissions" ADD COLUMN "email_hash" text;--> statement-breakpoint
ALTER TABLE "simulated_orders" ADD COLUMN "customer_email_hash" text;--> statement-breakpoint
CREATE INDEX "idx_contact_submissions_email_hash" ON "contact_submissions" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX "idx_simulated_orders_email_hash" ON "simulated_orders" USING btree ("customer_email_hash");