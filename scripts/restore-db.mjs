import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parsePostgresUrl } from "./pg-env.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function runRestore() {
  const targetUrl =
    process.env.RESTORE_DATABASE_URL ||
    process.env.MIGRATION_DATABASE_URL ||
    process.env.DATABASE_URL;
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.error("Error: Please provide the path to the backup file (.sql or .sql.gz).");
    console.error("Usage: pnpm run db:restore ./backups/db-backup-2026-07-22.sql.gz");
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`Error: Backup file "${backupFile}" does not exist.`);
    process.exit(1);
  }

  if (!targetUrl) {
    console.error(
      "Error: Target database connection string (RESTORE_DATABASE_URL / MIGRATION_DATABASE_URL) is missing.",
    );
    process.exit(1);
  }

  const isGzip = backupFile.endsWith(".gz");
  const stats = fs.statSync(backupFile);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚨 ENTERPRISE DATABASE RESTORE PROCEDURE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Source File: ${path.basename(backupFile)} (${formatBytes(stats.size)})`);
  console.log(`Target URL:  ${targetUrl.replace(/:[^:@]+@/, ":****@")}`);
  console.log("---------------------------------------------------------------");

  // Use standard libpq environment variables so credentials are not exposed in process tables (argv / ps)
  const restoreCmd = isGzip ? `gunzip -c "${backupFile}" | psql` : `psql < "${backupFile}"`;

  try {
    const startTime = Date.now();
    console.log("Executing database restoration...");
    const pgEnv = {
      ...process.env,
      ...parsePostgresUrl(targetUrl),
    };
    execSync(restoreCmd, { shell: "/bin/bash", stdio: "inherit", env: pgEnv });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ Database restoration completed successfully in " + duration + "s!");
  } catch (error) {
    console.error("\n❌ Database restoration failed:", error.message);
    process.exit(1);
  }
}

runRestore();
