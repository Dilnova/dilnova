#!/usr/bin/env node
/**
 * Ensures drizzle SQL files and meta/_journal.json stay in sync.
 * Run via: pnpm db:verify
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const drizzleDir = path.join(rootDir, "drizzle");
const journalPath = path.join(drizzleDir, "meta", "_journal.json");

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
const entries = journal.entries ?? [];

if (entries.length === 0) {
  fail("Migration journal has no entries.");
}

const sqlFiles = fs
  .readdirSync(drizzleDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const journalTags = entries.map((entry) => entry.tag);
const journalSqlFiles = journalTags.map((tag) => `${tag}.sql`);

for (let index = 0; index < entries.length; index += 1) {
  if (entries[index].idx !== index) {
    fail(
      `Journal entry idx mismatch at position ${index}: expected idx ${index}, got ${entries[index].idx}.`,
    );
  }
}

for (const expectedFile of journalSqlFiles) {
  if (!sqlFiles.includes(expectedFile)) {
    fail(`Journal references missing migration file: ${expectedFile}`);
  }
}

for (const sqlFile of sqlFiles) {
  if (!journalSqlFiles.includes(sqlFile)) {
    fail(`SQL file is not listed in journal: ${sqlFile}`);
  }
}

const snapshotFiles = fs
  .readdirSync(path.join(drizzleDir, "meta"))
  .filter((name) => name.endsWith("_snapshot.json"))
  .sort();

const lastEntry = entries[entries.length - 1];
const expectedLatestSnapshot = `${String(lastEntry.idx).padStart(4, "0")}_snapshot.json`;

if (!snapshotFiles.includes(expectedLatestSnapshot)) {
  fail(`Missing latest snapshot ${expectedLatestSnapshot} for journal entry ${lastEntry.tag}.`);
}

if (snapshotFiles[snapshotFiles.length - 1] !== expectedLatestSnapshot) {
  fail(
    `Latest snapshot file should be ${expectedLatestSnapshot}, found ${snapshotFiles[snapshotFiles.length - 1]}.`,
  );
}

ok(`Journal contains ${entries.length} migrations (${journalTags[journalTags.length - 1]}).`);
ok(`${sqlFiles.length} SQL files match journal entries.`);
ok(`Latest snapshot present: ${expectedLatestSnapshot}.`);

console.log("\nMigration journal verification passed.");
