import { URL } from "url";

/**
 * Parses a PostgreSQL connection URI into standard libpq environment variables.
 * This prevents credentials and connection strings from being exposed via command-line
 * arguments (argv) in process lists (e.g. ps -ef, /proc/[pid]/cmdline).
 *
 * @param {string} urlStr
 * @returns {Record<string, string>}
 */
export function parsePostgresUrl(urlStr) {
  if (!urlStr) {
    throw new Error("PostgreSQL connection URL is required.");
  }

  const u = new URL(urlStr);
  const envMap = {
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username || ""),
    PGPASSWORD: decodeURIComponent(u.password || ""),
    PGDATABASE: u.pathname.replace(/^\//, ""),
  };

  const sslmode = u.searchParams.get("sslmode");
  if (sslmode) {
    envMap.PGSSLMODE = sslmode;
  }

  return envMap;
}

function escapeShell(val) {
  return "'" + String(val).replace(/'/g, "'\\''") + "'";
}

// When executed directly (e.g. `node scripts/pg-env.mjs`)
if (process.argv[1] && process.argv[1].endsWith("pg-env.mjs")) {
  const targetUrl = process.env.TARGET_DATABASE_URL || process.argv[2];
  if (!targetUrl) {
    console.error("Error: TARGET_DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  try {
    const envVars = parsePostgresUrl(targetUrl);
    for (const [key, val] of Object.entries(envVars)) {
      if (val) {
        console.log(`export ${key}=${escapeShell(val)}`);
      }
    }
  } catch (err) {
    console.error("Error parsing PostgreSQL URL:", err.message);
    process.exit(1);
  }
}
