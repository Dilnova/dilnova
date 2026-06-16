/**
 * Push schema to database using drizzle-orm.
 * Run: npx tsx db/push-schema.ts
 */
import path from 'path';
process.env.HOME = path.resolve(process.cwd(), 'scratch');
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Safety guard: prevent accidental execution against production database
if (connectionString.includes('hfwqgybpeszocescyjea') && !process.argv.includes('--force-production')) {
  console.error('❌ ABORTED: DATABASE_URL points to the production database.');
  console.error('   Use a separate Supabase project for local development.');
  console.error('   To override (dangerous), pass --force-production');
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false, max: 1 });
const db = drizzle(client);

async function push() {
  console.log('Creating IMS tables...');
  
  // Create suppliers table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers (org_id)`);
  console.log('✓ suppliers');

  // Create inventory table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
      sku TEXT,
      quantity INTEGER DEFAULT 0 NOT NULL,
      low_stock_threshold INTEGER DEFAULT 5 NOT NULL,
      bin_location TEXT,
      supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory (product_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory (supplier_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory (sku)`);
  console.log('✓ inventory');

  // Create inventory_movements table
  await db.execute(sql`
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
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_id ON inventory_movements (inventory_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements (type)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements (created_at)`);
  console.log('✓ inventory_movements');

  // Create simulated_orders table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS simulated_orders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at TIMESTAMP DEFAULT now() NOT NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_simulated_orders_status ON simulated_orders (status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_simulated_orders_created_at ON simulated_orders (created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_simulated_orders_email ON simulated_orders (customer_email)`);
  console.log('✓ simulated_orders');

  // Create simulated_order_items table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS simulated_order_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES simulated_orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      vendor_org_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_simulated_order_items_order_id ON simulated_order_items (order_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_simulated_order_items_product_id ON simulated_order_items (product_id)`);
  console.log('✓ simulated_order_items');

  console.log('Altering existing categories & products tables for Enterprise Grade features...');

  // Drop deprecated registry tables if they exist
  await db.execute(sql`DROP TABLE IF EXISTS catalog_registry CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS enterprise_categories CASCADE`);

  // Create tax_classes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tax_classes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      rate_percent REAL NOT NULL,
      code TEXT NOT NULL UNIQUE
    )
  `);
  console.log('✓ tax_classes');

  // Create metadata_templates table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS metadata_templates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      fields JSONB NOT NULL
    )
  `);
  console.log('✓ metadata_templates');

  // Alter existing categories table to support parent_id references and templates
  await db.execute(sql`
    ALTER TABLE categories 
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS localized_names JSONB,
    ADD COLUMN IF NOT EXISTS localized_descriptions JSONB,
    ADD COLUMN IF NOT EXISTS metadata_template_id UUID REFERENCES metadata_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tax_class_id UUID REFERENCES tax_classes(id),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now() NOT NULL
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug)`);
  console.log('✓ categories altered');

  // Alter existing products table to support sku, barcodes, attributes
  await db.execute(sql`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS barcodes JSONB DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
    ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb NOT NULL
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN (attributes)`);
  console.log('✓ products altered');

  // Create service_configurations table linked to products
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS service_configurations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
      duration_minutes INTEGER NOT NULL,
      buffer_minutes INTEGER DEFAULT 0 NOT NULL,
      requires_resource_allocation BOOLEAN DEFAULT false NOT NULL
    )
  `);
  console.log('✓ service_configurations');

  // Create inventory_balances table linked to products
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_balances (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      location_id UUID NOT NULL,
      quantity_on_hand REAL DEFAULT 0.0 NOT NULL,
      allocated_quantity REAL DEFAULT 0.0 NOT NULL,
      low_stock_threshold REAL DEFAULT 1.0 NOT NULL,
      bin_location TEXT,
      CONSTRAINT unique_location_item UNIQUE (location_id, product_id)
    )
  `);
  console.log('✓ inventory_balances');

  console.log('\n✅ All tables and schemas updated successfully!');
  await client.end();
  process.exit(0);
}

push().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
