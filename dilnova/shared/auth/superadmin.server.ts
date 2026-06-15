import type { User } from '@clerk/nextjs/server';

/** Stored in Clerk user privateMetadata — server-only, not client-readable. */
export const SUPERADMIN_PLATFORM_ROLE = 'superadmin';

export type SuperAdminGrantSource = 'private' | 'allowlist';

export interface SuperAdminGrant {
  granted: boolean;
  source: SuperAdminGrantSource | null;
}

export function getSuperAdminAllowlistFromEnv(): Set<string> {
  const raw = process.env.SUPERADMIN_USER_IDS?.trim();
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

export function readSuperAdminGrant(user: {
  id: string;
  publicMetadata?: unknown;
  privateMetadata?: unknown;
}): SuperAdminGrant {
  const privateMeta = (user.privateMetadata || {}) as Record<string, unknown>;
  if (privateMeta.platformRole === SUPERADMIN_PLATFORM_ROLE) {
    return { granted: true, source: 'private' };
  }

  if (getSuperAdminAllowlistFromEnv().has(user.id)) {
    return { granted: true, source: 'allowlist' };
  }

  return { granted: false, source: null };
}

export function isSuperAdminUser(user: {
  id: string;
  publicMetadata?: unknown;
  privateMetadata?: unknown;
}): boolean {
  return readSuperAdminGrant(user).granted;
}

export type SuperAdminUser = User;
