/* eslint-disable */
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const postgres = require('postgres');

async function checkSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  try {
    console.log('--- Inspecting Database Tables and Columns ---');
    
    // Check categories table columns
    const categoryCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'categories'
    `;
    console.log('\n[categories table columns]:');
    categoryCols.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    // Check products table columns
    const productCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'products'
    `;
    console.log('\n[products table columns]:');
    productCols.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Schema inspection failed:', error);
  } finally {
    await sql.end();
  }
}

checkSchema();
