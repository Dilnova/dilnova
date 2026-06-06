import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function checkInventory() {
  console.log("Fetching all products...");
  const products = await db.select().from(schema.products);
  console.log(`Total Products: ${products.length}`);
  for (const prod of products) {
    console.log(`- Product ID: ${prod.id}, Name: ${prod.name}, Type: ${prod.type}, OrgId: ${prod.orgId}`);
  }

  console.log("\nFetching all inventory items...");
  const inventory = await db.select().from(schema.inventory);
  console.log(`Total Inventory Rows: ${inventory.length}`);
  for (const inv of inventory) {
    console.log(`- Inv ID: ${inv.id}, ProductId: ${inv.productId}, SKU: ${inv.sku}, Qty: ${inv.quantity}`);
  }

  await client.end();
}

checkInventory().catch(console.error);
