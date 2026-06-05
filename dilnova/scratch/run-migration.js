/* eslint-disable */
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  try {
    const migrationPath = path.join(__dirname, '../drizzle/0002_absent_warpath.sql');
    console.log(`Reading migration from: ${migrationPath}`);
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // Split statements by drizzle-kit breakpoint or standard semicolons
    let statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Make table creation safe (IF NOT EXISTS)
    statements = statements.map(s => {
      if (s.startsWith('CREATE TABLE')) {
        return s.replace(/^CREATE TABLE\s+"([^"]+)"/i, 'CREATE TABLE IF NOT EXISTS "$1"');
      }
      return s;
    });

    console.log(`Executing ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\n--- Executing Statement ${i + 1}/${statements.length} ---`);
      console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));
      try {
        await sql.unsafe(stmt);
        console.log('Success.');
      } catch (err) {
        if (err.message && (err.message.includes('already exists') || err.message.includes('already a foreign key'))) {
          console.log(`Skipped (already exists): ${err.message}`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

runMigration();
