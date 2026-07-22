import postgres from "postgres";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.local" });

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const files = fs
      .readdirSync("drizzle")
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // Create __drizzle_migrations if it doesn't exist just to see
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial primary key, hash text, created_at bigint)`;

    for (const f of files) {
      console.log(`Testing migration ${f}...`);
      const fileContent = fs.readFileSync(path.join("drizzle", f), "utf8");
      try {
        await sql.begin(async (sql) => {
          await sql.unsafe(fileContent);
          throw new Error("ROLLBACK_TEST"); // Rollback so we don't actually apply it
        });
      } catch (err) {
        if (err.message === "ROLLBACK_TEST") {
          console.log(`✅ ${f} works fine.`);
        } else {
          console.error(`❌ ${f} failed:`, err);
          break; // Stop at the first real failure
        }
      }
    }
  } finally {
    await sql.end();
  }
}
run();
