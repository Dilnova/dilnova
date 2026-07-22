import postgres from "postgres";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing in .env.local");
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  try {
    const password = crypto.randomBytes(24).toString("hex");
    const roleName = "dilnova_app";

    console.log(`Setting up restricted role '${roleName}'...`);

    const roles = await sql`SELECT rolname FROM pg_roles WHERE rolname = ${roleName}`;

    if (roles.length === 0) {
      console.log(`Creating role ${roleName}...`);
      await sql.unsafe(`CREATE ROLE ${roleName} WITH LOGIN PASSWORD '${password}'`);
    } else {
      console.log(`Role ${roleName} already exists, updating password...`);
      await sql.unsafe(`ALTER ROLE ${roleName} WITH PASSWORD '${password}'`);
    }

    console.log("Granting schema usage...");
    await sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${roleName}`);

    console.log("Granting DML permissions on existing tables...");
    await sql.unsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleName}`,
    );

    console.log("Setting default privileges for future tables...");
    await sql.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName}`,
    );

    console.log("Role setup complete!");
    console.log("--- NEW_CONNECTION_STRING_START ---");

    const url = new URL(connectionString);
    url.username = roleName;
    url.password = password;
    console.log(url.toString());
    console.log("--- NEW_CONNECTION_STRING_END ---");
  } catch (error) {
    console.error("Error setting up role:", error);
  } finally {
    await sql.end();
  }
}

main();
