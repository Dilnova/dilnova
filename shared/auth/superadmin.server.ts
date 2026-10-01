import type { User } from "@clerk/nextjs/server";
import { env } from "@/shared/config/env";

/** Stored in Clerk user privateMetadata — server-only, not client-readable. */
export const SUPERADMIN_PLATFORM_ROLE = "superadmin";

export type SuperAdminGrantSource = "dual_gate";

export interface SuperAdminGrant {
  granted: boolean;
  source: SuperAdminGrantSource | null;
}

export function getSuperAdminAllowlistFromEnv(): Set<string> {
  return new Set(env.auth.superadminUserIds);
}

export function readSuperAdminGrant(user: {
  id: string;
  publicMetadata?: unknown;
  privateMetadata?: unknown;
}): SuperAdminGrant {
  const privateMeta = (user.privateMetadata || {}) as Record<string, unknown>;
  const isPrivateSuper = privateMeta.platformRole === SUPERADMIN_PLATFORM_ROLE;
  const isAllowlisted = getSuperAdminAllowlistFromEnv().has(user.id);

  if (isPrivateSuper && isAllowlisted) {
    return { granted: true, source: "dual_gate" };
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
