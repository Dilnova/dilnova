#!/usr/bin/env node
/**
 * One-time migration: grant superadmin via Clerk privateMetadata.platformRole.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_... node scripts/migrate-superadmin-metadata.mjs --dry-run
 *   CLERK_SECRET_KEY=sk_... node scripts/migrate-superadmin-metadata.mjs
 *
 * Optional env:
 *   SUPERADMIN_USER_IDS=user_abc,user_def
 */
const dryRun = process.argv.includes("--dry-run");
const secretKey = process.env.CLERK_SECRET_KEY;
const allowlist = new Set(
  (process.env.SUPERADMIN_USER_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
);

// SECURITY: Safely skip in CI using all three conditions.
const isCiDummy =
  process.env.CLERK_SECRET_KEY === "sk_test_ci_dummy" &&
  process.env.NODE_ENV !== "production" &&
  process.env.VERCEL !== "1";
if (!secretKey || secretKey.includes("placeholder") || isCiDummy) {
  console.log("CLERK_SECRET_KEY is missing, placeholder, or CI environment. Skipping migration.");
  process.exit(0);
}

const clerkApi = "https://api.clerk.com/v1";
const PLATFORM_ROLE = "superadmin";
const LEGACY_PUBLIC_ROLE = "admin";

async function clerkFetch(path, options = {}) {
  const response = await fetch(`${clerkApi}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
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

let migrated = 0;
let skipped = 0;
let offset = 0;
const limit = 100;

while (true) {
  const page = await clerkFetch(`/users?limit=${limit}&offset=${offset}`);
  const users = page.data ?? [];

  for (const user of users) {
    const publicMeta = { ...(user.public_metadata || {}) };
    const privateMeta = { ...(user.private_metadata || {}) };
    const alreadyPrivate = privateMeta.platformRole === PLATFORM_ROLE;
    const legacyPublic = publicMeta.role === LEGACY_PUBLIC_ROLE;
    const allowlisted = allowlist.has(user.id);

    if (!alreadyPrivate && !legacyPublic && !allowlisted) {
      skipped += 1;
      continue;
    }

    if (alreadyPrivate) {
      skipped += 1;
      continue;
    }

    const nextPrivate = {
      ...privateMeta,
      platformRole: PLATFORM_ROLE,
    };

    const nextPublic = { ...publicMeta };
    if (nextPublic.role === LEGACY_PUBLIC_ROLE) {
      nextPublic.role = "vendor";
    }

    console.log(
      `${dryRun ? "[dry-run] " : ""}Grant superadmin to ${user.id} (${user.email_addresses?.[0]?.email_address ?? "no-email"})`,
    );

    if (!dryRun) {
      await clerkFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          private_metadata: nextPrivate,
          public_metadata: nextPublic,
        }),
      });
    }

    migrated += 1;
  }

  offset += users.length;
  const totalCount = page.total_count ?? users.length;
  if (offset >= totalCount || users.length === 0) {
    break;
  }
}

console.log(`\nDone. Migrated: ${migrated}, skipped: ${skipped}${dryRun ? " (dry-run)" : ""}.`);
