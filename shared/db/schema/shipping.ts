import { pgTable, text, timestamp, integer, uuid, index, boolean } from "drizzle-orm/pg-core";

export const orgShippingRules = pgTable(
  "org_shipping_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    ruleType: text("rule_type").default("domestic").notNull(), // 'domestic' | 'international'
    zone: text("zone").notNull(), // 'western' | 'domestic' | 'asia' | 'europe' | 'us_canada' | 'rest_of_world'
    minWeightGrams: integer("min_weight_grams").default(0).notNull(),
    maxWeightGrams: integer("max_weight_grams"),
    baseAmountCents: integer("base_amount_cents").default(0).notNull(),
    perKgCents: integer("per_kg_cents").default(0).notNull(),
    estimatedDays: integer("estimated_days").default(5).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_org_shipping_rules_org").on(t.orgId),
    index("idx_org_shipping_rules_lookup").on(t.orgId, t.ruleType, t.zone),
  ],
);
