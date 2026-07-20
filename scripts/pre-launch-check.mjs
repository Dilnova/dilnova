#!/usr/bin/env node
/**
 * Pre-launch environment checklist (does not call external APIs).
 *
 * Usage:
 *   node scripts/pre-launch-check.mjs
 *   node scripts/pre-launch-check.mjs --strict   # fail on optional warnings
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local (higher priority overrides)
config({ path: resolve(__dirname, '..', '.env.local'), override: true });

const strict = process.argv.includes('--strict');

const required = [
  'DATABASE_URL',
  'PII_ENCRYPTION_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'HEALTH_CHECK_SECRET',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'EMAIL_FROM_ADDRESS',
  'EMAIL_FROM_NAME',
  'SUPERADMIN_USER_IDS',
  'CLERK_WEBHOOK_SECRET',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
];

const recommended = [];

let failed = 0;

for (const key of required) {
  const value = process.env[key];
  if (!value || !String(value).trim()) {
    console.error(`✗ Missing required: ${key}`);
    failed += 1;
  } else {
    console.log(`✓ ${key}`);
  }
}

for (const key of recommended) {
  const value = process.env[key];
  if (!value || !String(value).trim()) {
    const msg = `⚠ Recommended: ${key}`;
    if (strict) {
      console.error(`✗ ${msg}`);
      failed += 1;
    } else {
      console.warn(msg);
    }
  } else {
    console.log(`✓ ${key}`);
  }
}

console.log('\nClerk migrations (run manually before marketing):');
console.log('  node scripts/migrate-bank-metadata.mjs --dry-run');
console.log('  node scripts/migrate-superadmin-metadata.mjs --dry-run');

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll required environment variables are set.');
