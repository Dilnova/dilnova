-- Create mock auth.jwt() for CI environments (standard postgres) without affecting Supabase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE pg_namespace.nspname = 'auth' AND pg_proc.proname = 'jwt'
    ) THEN
        CREATE SCHEMA IF NOT EXISTS auth;
        EXECUTE 'CREATE FUNCTION auth.jwt() RETURNS jsonb AS $func$ BEGIN RETURN ''{}''::jsonb; END; $func$ LANGUAGE plpgsql;';
    END IF;
END $$;

-- Create mock Supabase roles for CI environments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
END $$;

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
