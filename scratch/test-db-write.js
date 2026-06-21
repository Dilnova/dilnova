/* eslint-disable */
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const postgres = require('postgres');

async function checkDatabaseWrites() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  try {
    console.log('Querying the PostgreSQL database for the latest catalog items...');
    const result = await sql`
      SELECT id, name, type, price, image_url, org_id, created_at 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    if (result.length === 0) {
      console.log('ℹ️ No items found in the products table.');
    } else {
      console.log('✅ Found latest products/services in database:');
      result.forEach((row, i) => {
        console.log(`\n[Item ${i + 1}]`);
        console.log(`  ID:          ${row.id}`);
        console.log(`  Name:        ${row.name}`);
        console.log(`  Type:        ${row.type}`);
        console.log(`  Price:       $${(row.price / 100).toFixed(2)}`);
        console.log(`  Image URL:   ${row.image_url || 'None'}`);
        console.log(`  Org ID:      ${row.org_id}`);
        console.log(`  Created At:  ${row.created_at}`);
      });
    }
  } catch (error) {
    console.error('❌ Database query failed:', error);
  } finally {
    await sql.end();
  }
}

checkDatabaseWrites();
