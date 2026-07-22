import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function runBackup() {
  const dbUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("Error: MIGRATION_DATABASE_URL or DATABASE_URL must be defined.");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `db-backup-${timestamp}.sql.gz`;
  const outputPath = path.join(backupDir, filename);

  console.log(`Starting PostgreSQL database backup...`);
  console.log(`Target Output: ${outputPath}`);

  try {
    // Check if pg_dump is available
    execSync("pg_dump --version", { stdio: "ignore" });
  } catch {
    console.error("Error: pg_dump utility is not installed or not in PATH.");
    console.error(
      "Please install postgresql-client (e.g. brew install postgresql or apt install postgresql-client).",
    );
    process.exit(1);
  }

  const command = `pg_dump "${dbUrl}" --clean --if-exists --no-owner --no-privileges | gzip > "${outputPath}"`;

  try {
    const startTime = Date.now();
    execSync(command, { shell: "/bin/bash" });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const stats = fs.statSync(outputPath);

    console.log("\n--- Database Backup Completed Successfully ---");
    console.log(`File: ${filename}`);
    console.log(`Size: ${formatBytes(stats.size)}`);
    console.log(`Time Elapsed: ${duration}s`);
    console.log("----------------------------------------------\n");

    // Upload to S3 / Backblaze B2 if S3_BACKUP_BUCKET is provided
    const bucket = process.env.S3_BACKUP_BUCKET;
    if (bucket) {
      console.log(`Uploading backup to S3/B2 bucket: ${bucket}...`);
      const endpointArg = process.env.S3_BACKUP_ENDPOINT
        ? `--endpoint-url ${process.env.S3_BACKUP_ENDPOINT}`
        : "";
      const regionArg = process.env.S3_BACKUP_REGION
        ? `--region ${process.env.S3_BACKUP_REGION}`
        : "";

      // Support relevant variable names or fall back to standard AWS CLI env vars
      const accessKey = process.env.S3_BACKUP_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.S3_BACKUP_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

      const envVars = {
        ...process.env,
        ...(accessKey && { AWS_ACCESS_KEY_ID: accessKey }),
        ...(secretKey && { AWS_SECRET_ACCESS_KEY: secretKey }),
      };

      const uploadCmd = `aws s3 cp "${outputPath}" "s3://${bucket}/db-backups/${filename}" ${endpointArg} ${regionArg}`;

      try {
        execSync(uploadCmd, { shell: "/bin/bash", env: envVars });
        console.log(`Successfully uploaded ${filename} to s3://${bucket}/db-backups/`);
      } catch (uploadError) {
        console.error("S3/B2 Upload failed. Check credentials:", uploadError.message);
      }
    }
  } catch (error) {
    console.error("Database backup failed:", error.message);
    process.exit(1);
  }
}

runBackup();
