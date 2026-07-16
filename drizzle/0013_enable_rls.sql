DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

-- Injected from db/push-schema.ts --
CREATE TABLE IF NOT EXISTS suppliers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers (org_id);
CREATE TABLE IF NOT EXISTS inventory (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
      sku TEXT,
      quantity INTEGER DEFAULT 0 NOT NULL,
      low_stock_threshold INTEGER DEFAULT 5 NOT NULL,
      bin_location TEXT,
      supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory (sku);
CREATE TABLE IF NOT EXISTS inventory_movements (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      quantity_changed INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      reason TEXT,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_id ON inventory_movements (inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements (type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements (created_at);
CREATE TABLE IF NOT EXISTS simulated_orders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_simulated_orders_status ON simulated_orders (status);
CREATE INDEX IF NOT EXISTS idx_simulated_orders_created_at ON simulated_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_simulated_orders_email ON simulated_orders (customer_email);
CREATE TABLE IF NOT EXISTS simulated_order_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES simulated_orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      vendor_org_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    );
CREATE INDEX IF NOT EXISTS idx_simulated_order_items_order_id ON simulated_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_simulated_order_items_product_id ON simulated_order_items (product_id);
DROP TABLE IF EXISTS catalog_registry;
DROP TABLE IF EXISTS enterprise_categories;
CREATE TABLE IF NOT EXISTS tax_classes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      rate_percent REAL NOT NULL,
      code TEXT NOT NULL UNIQUE
    );
CREATE TABLE IF NOT EXISTS metadata_templates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      fields JSONB NOT NULL
    );
ALTER TABLE categories 
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS localized_names JSONB,
    ADD COLUMN IF NOT EXISTS localized_descriptions JSONB,
    ADD COLUMN IF NOT EXISTS metadata_template_id UUID REFERENCES metadata_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tax_class_id UUID REFERENCES tax_classes(id),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now() NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS barcodes JSONB DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
    ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN (attributes);
CREATE TABLE IF NOT EXISTS service_configurations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
      duration_minutes INTEGER NOT NULL,
      buffer_minutes INTEGER DEFAULT 0 NOT NULL,
      requires_resource_allocation BOOLEAN DEFAULT false NOT NULL
    );
CREATE TABLE IF NOT EXISTS inventory_balances (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      location_id UUID NOT NULL,
      quantity_on_hand REAL DEFAULT 0.0 NOT NULL,
      allocated_quantity REAL DEFAULT 0.0 NOT NULL,
      low_stock_threshold REAL DEFAULT 1.0 NOT NULL,
      bin_location TEXT,
      CONSTRAINT unique_location_item UNIQUE (location_id, product_id)
    );
-- End injected schema --



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