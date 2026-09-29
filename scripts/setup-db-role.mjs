import postgres from "postgres";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });

/**
 * Builds the least-privilege connection string, preserving Supabase pooler username formatting.
 * For example:
 *   postgresql://postgres.projectref:pass@pooler.supabase.com:6543/postgres
 * becomes:
 *   postgresql://dilnova_app.projectref:newpass@pooler.supabase.com:6543/postgres
 */
export function buildRuntimeConnectionString(baseUri, roleName, password) {
  const url = new URL(baseUri);
  const origUser = decodeURIComponent(url.username);
  const projectSuffix = origUser.includes(".") ? origUser.slice(origUser.indexOf(".")) : "";
  url.username = encodeURIComponent(`${roleName}${projectSuffix}`);
  url.password = encodeURIComponent(password);
  return url.toString();
}

/**
 * Returns the SQL statements to provision or harden the least-privilege database role.
 */
export function generateRoleSetupSql(roleName, password) {
  return [
    `DO $$`,
    `BEGIN`,
    `  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${roleName}') THEN`,
    `    CREATE ROLE ${roleName} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`,
    `  ELSE`,
    `    ALTER ROLE ${roleName} WITH PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`,
    `  END IF;`,
    `END $$;`,
    `REVOKE CREATE ON SCHEMA public FROM ${roleName};`,
    `GRANT USAGE ON SCHEMA public TO ${roleName};`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleName};`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleName};`,
    `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${roleName};`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName};`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${roleName};`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${roleName};`,
  ].join("\n");
}

async function main() {
  const adminConnectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

  if (!adminConnectionString) {
    console.error("Error: MIGRATION_DATABASE_URL or DATABASE_URL must be defined in .env.local");
    process.exit(1);
  }

  const roleName = process.env.APP_DB_ROLE || "dilnova_app";
  const password = process.env.APP_DB_PASSWORD || crypto.randomBytes(24).toString("hex");

  console.log(`Setting up least-privilege role '${roleName}'...`);
  console.log("Connecting using administrative connection...");

  const sql = postgres(adminConnectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    ssl: process.env.DATABASE_SSL !== "false",
  });

  try {
    const roles = await sql`SELECT rolname FROM pg_roles WHERE rolname = ${roleName}`;

    if (roles.length === 0) {
      console.log(`Creating role '${roleName}' with restricted privileges...`);
      await sql.unsafe(
        `CREATE ROLE ${roleName} WITH LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
      );
    } else {
      console.log(`Role '${roleName}' exists; updating password and enforcing restrictions...`);
      await sql.unsafe(
        `ALTER ROLE ${roleName} WITH PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
      );
    }

    console.log("Revoking CREATE privileges on public schema...");
    await sql.unsafe(`REVOKE CREATE ON SCHEMA public FROM ${roleName}`);

    console.log("Granting USAGE on public schema...");
    await sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${roleName}`);

    console.log("Granting DML privileges (SELECT, INSERT, UPDATE, DELETE) on existing tables...");
    await sql.unsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleName}`,
    );

    console.log("Granting USAGE, SELECT on sequences (for auto-increment/identity columns)...");
    await sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleName}`);

    console.log("Granting EXECUTE on all functions...");
    await sql.unsafe(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${roleName}`);

    console.log("Configuring default privileges for future migrations...");
    await sql.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName}`,
    );
    await sql.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${roleName}`,
    );
    await sql.unsafe(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${roleName}`,
    );

    console.log("\n✅ Least-privilege role setup complete!");

    const runtimeConnectionSource = process.env.DATABASE_URL || adminConnectionString;
    const runtimeUrl = buildRuntimeConnectionString(runtimeConnectionSource, roleName, password);

    console.log("\n===================================================================");
    console.log("  LEAST-PRIVILEGE APPLICATION RUNTIME CONNECTION STRING");
    console.log("===================================================================");
    console.log(`DATABASE_URL="${runtimeUrl}"`);
    console.log("===================================================================");
    console.log("\nInstructions:");
    console.log("  1. Update DATABASE_URL in your .env.local and Vercel environment variables.");
    console.log(
      "  2. Keep MIGRATION_DATABASE_URL with the administrative 'postgres' role for DDL migrations.",
    );
    console.log("  3. Run 'pnpm pre-launch' to verify your configuration.\n");
  } catch (error) {
    console.error("Error setting up role:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Only auto-run if directly invoked as CLI entry point
if (process.argv[1] && process.argv[1].endsWith("setup-db-role.mjs")) {
  main();
}
