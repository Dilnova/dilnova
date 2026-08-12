CREATE TABLE IF NOT EXISTS "org_shipping_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"rule_type" text DEFAULT 'domestic' NOT NULL,
	"zone" text NOT NULL,
	"min_weight_grams" integer DEFAULT 0 NOT NULL,
	"max_weight_grams" integer,
	"base_amount_cents" integer DEFAULT 0 NOT NULL,
	"per_kg_cents" integer DEFAULT 0 NOT NULL,
	"estimated_days" integer DEFAULT 5 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_shipping_rules_org" ON "org_shipping_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_shipping_rules_lookup" ON "org_shipping_rules" USING btree ("org_id","rule_type","zone");
