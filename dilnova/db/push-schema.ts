/**
 * Push schema to database using drizzle-orm.
 * Run: npx tsx db/push-schema.ts
 */
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

  console.log('\n✅ All IMS tables created successfully!');
  await client.end();
  process.exit(0);
}

push().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
