import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function verify() {
  console.log("🚀 Running schema verification inserts...");

  // 1. Insert a Tax Class
  console.log("Inserting Tax Class...");
  const [tax] = await db.insert(schema.taxClasses).values({
    name: 'Standard GST',
    ratePercent: 15.0,
    code: 'GST_15',
  }).onConflictDoNothing().returning();
  
  const taxId = tax?.id || (await db.select().from(schema.taxClasses).limit(1))[0]?.id;
  console.log("✓ Tax Class ID:", taxId);

  // 2. Insert a Metadata Template for Vehicles
  console.log("Inserting Metadata Template for Vehicles...");
  const [template] = await db.insert(schema.metadataTemplates).values({
    name: 'Automotive Template',
    fields: [
      { key: 'vin', label: 'VIN Number', type: 'string', required: true },
      { key: 'make', label: 'Manufacturer', type: 'string', required: true },
      { key: 'year', label: 'Manufacture Year', type: 'number', required: true },
      { key: 'mileage', label: 'Current Mileage', type: 'number', required: false, unit: 'km' }
    ]
  }).returning();
  console.log("✓ Metadata Template ID:", template.id);

  // 3. Insert a Category (Vehicles)
  console.log("Inserting Enterprise Category (Vehicles)...");
  const [category] = await db.insert(schema.categories).values({
    name: 'Cars',
    slug: 'vehicles-cars-test',
    localizedNames: { en: 'Cars', si: 'මෝටර් රථ' },
    localizedDescriptions: { en: 'Passenger motor vehicles' },
    metadataTemplateId: template.id,
    taxClassId: taxId,
  }).returning();
  console.log("✓ Enterprise Category ID:", category.id);

  // 4. Insert a Catalog Item (Tesla Model Y)
  console.log("Inserting Catalog Item (Tesla Model Y)...");
  const [car] = await db.insert(schema.products).values({
    name: 'Tesla Model Y 2024',
    type: 'product',
    price: 4799000,
    orgId: 'org_test_vendor',
    categoryId: category.id,
    sku: 'CAR-TESLA-MY2024-TEST',
    barcodes: ['1FA6P8CF0HXXXXXXX'],
    status: 'active',
    attributes: {
      vin: '5YJ3E1EB2LFXXXXXX',
      make: 'Tesla',
      year: 2024,
      mileage: 8500
    }
  }).returning();
  console.log("✓ Catalog Item SKU:", car.sku);

  // 5. Query using JSONB dynamic fields
  console.log("Querying products by dynamic vehicle year...");
  const results = await db.select()
    .from(schema.products)
    .where(sql`(${schema.products.attributes}->>'year')::numeric = 2024`);
  
  console.log("✓ Query matched items count:", results.length);
  results.forEach(item => {
    console.log(`  - Name: ${item.name}, SKU: ${item.sku}, Attributes:`, item.attributes);
  });

  console.log("\n✅ Verification complete! Tables configured correctly.");
  await client.end();
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
