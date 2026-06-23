-- products
DO $$
BEGIN
    CREATE POLICY "Tenant isolation for products" ON "products"
    AS PERMISSIVE FOR ALL TO authenticated
    USING (org_id = (select auth.jwt()->>'org_id'))
    WITH CHECK (org_id = (select auth.jwt()->>'org_id'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- suppliers
DO $$
BEGIN
    CREATE POLICY "Tenant isolation for suppliers" ON "suppliers"
    AS PERMISSIVE FOR ALL TO authenticated
    USING (org_id = (select auth.jwt()->>'org_id'))
    WITH CHECK (org_id = (select auth.jwt()->>'org_id'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- branches
DO $$
BEGIN
    CREATE POLICY "Tenant isolation for branches" ON "branches"
    AS PERMISSIVE FOR ALL TO authenticated
    USING (org_id = (select auth.jwt()->>'org_id'))
    WITH CHECK (org_id = (select auth.jwt()->>'org_id'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- billing_receipts
DO $$
BEGIN
    CREATE POLICY "Tenant isolation for billing_receipts" ON "billing_receipts"
    AS PERMISSIVE FOR ALL TO authenticated
    USING (org_id = (select auth.jwt()->>'org_id'))
    WITH CHECK (org_id = (select auth.jwt()->>'org_id'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- simulated_order_items
DO $$
BEGIN
    CREATE POLICY "Tenant isolation for simulated_order_items" ON "simulated_order_items"
    AS PERMISSIVE FOR ALL TO authenticated
    USING (vendor_org_id = (select auth.jwt()->>'org_id'))
    WITH CHECK (vendor_org_id = (select auth.jwt()->>'org_id'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
