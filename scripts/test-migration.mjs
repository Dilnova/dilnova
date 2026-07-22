import postgres from "postgres";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const file = fs.readFileSync("drizzle/0013_enable_rls.sql", "utf8");
    await sql.unsafe(file);
    console.log("Migration succeeded!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}
run();
