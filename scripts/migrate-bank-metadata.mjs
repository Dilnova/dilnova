#!/usr/bin/env node
/**
 * One-time migration: move bank transfer fields from Clerk publicMetadata to privateMetadata.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_... node scripts/migrate-bank-metadata.mjs
 *   CLERK_SECRET_KEY=sk_... node scripts/migrate-bank-metadata.mjs --dry-run
 */
const BANK_KEYS = [
  'bankName',
  'bankAccountName',
  'bankAccountNumber',
  'bankBranchCode',
  'bankTransferInstructions',
];

const dryRun = process.argv.includes('--dry-run');
const secretKey = process.env.CLERK_SECRET_KEY;

if (!secretKey || secretKey.includes('placeholder')) {
  console.warn('CLERK_SECRET_KEY is missing or is a placeholder. Skipping migration.');
  process.exit(0);
}

const clerkApi = 'https://api.clerk.com/v1';

async function clerkFetch(path, options = {}) {
  const response = await fetch(`${clerkApi}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk API ${path} failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function stripBankFields(meta) {
  const next = { ...meta };
  for (const key of BANK_KEYS) {
    delete next[key];
  }
  return next;
}

function hasBankFields(meta) {
  return BANK_KEYS.some((key) => typeof meta[key] === 'string' && meta[key].trim());
}

let migrated = 0;
let skipped = 0;
let offset = 0;
const limit = 100;

while (true) {
  const page = await clerkFetch(`/organizations?limit=${limit}&offset=${offset}`);
  const orgs = page.data ?? [];

  for (const org of orgs) {
    const publicMeta = { ...(org.public_metadata || {}) };
    if (!hasBankFields(publicMeta)) {
      skipped += 1;
      continue;
    }

    const privateMeta = { ...(org.private_metadata || {}) };
    for (const key of BANK_KEYS) {
      if (typeof publicMeta[key] === 'string') {
        privateMeta[key] = publicMeta[key];
      }
    }

    const cleanedPublic = stripBankFields(publicMeta);

    console.log(
      `${dryRun ? '[dry-run] ' : ''}Migrate org ${org.id} (${org.name}) — bank fields → private_metadata`
    );

    if (!dryRun) {
      await clerkFetch(`/organizations/${org.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          public_metadata: cleanedPublic,
          private_metadata: privateMeta,
        }),
      });
    }

    migrated += 1;
  }

  offset += orgs.length;
  const totalCount = page.total_count ?? orgs.length;
  if (offset >= totalCount || orgs.length === 0) {
    break;
  }
}

console.log(`\nDone. Migrated: ${migrated}, skipped: ${skipped}${dryRun ? ' (dry-run)' : ''}.`);
