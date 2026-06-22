DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pricing_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "metadata_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wishlists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simulated_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simulated_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branch_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branch_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_receipt_items" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "system_settings" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "audit_logs" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "pricing_plans" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "contact_submissions" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "tax_classes" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "metadata_templates" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "categories" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "products" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "reviews" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "wishlists" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "questions" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "service_configurations" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "simulated_orders" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "customer_carts" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "simulated_order_items" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "suppliers" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "inventory" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "inventory_movements" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "inventory_balances" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "branches" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "branch_inventory" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "branch_members" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "billing_receipts" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$
BEGIN
    CREATE POLICY "Allow service_role full access" ON "billing_receipt_items" FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;