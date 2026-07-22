/**
 * lib/safe-action.ts
 *
 * Central safe-action client built on next-safe-action v8.
 *
 * Exports four pre-configured action wrappers:
 *   • actionClient          – base client (no auth)
 *   • authenticatedAction   – requires a signed-in Clerk user
 *   • vendorAction          – requires vendor / org-member / superadmin role
 *   • orgAdminAction        – requires org:admin / superadmin role
 *   • superadminAction      – requires platform superadmin (dual-gate)
 *
 * All wrappers share a single auth() call that is threaded through ctx
 * so downstream middleware never re-invokes auth() redundantly.
 */

import { createSafeActionClient } from "next-safe-action";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/shared/db/client";
import { logger } from "@/shared/logging/logger";
import { getCachedUserRole, getCachedIsSuperAdmin } from "@/shared/auth/clerk-cache";
import { isSuperAdminUser } from "@/shared/auth/superadmin.server";

// ─── Custom typed error ────────────────────────────────────────────────────────
// Next.js redacts arbitrary thrown Error messages in production. Throwing
// ActionError bypasses the redaction when caught by handleServerError below.
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

// ─── Base client ───────────────────────────────────────────────────────────────
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    // Always log the full error server-side so it lands in Sentry / logger.
    logger.error("Server Action unhandled error", e);

    // Return human-readable message for ActionError; redact everything else.
    if (e instanceof ActionError) {
      return e.message;
    }
    return "An unexpected error occurred. Please try again.";
  },
});

// ─── Authenticated action ─────────────────────────────────────────────────────
// Guarantees: userId is non-null.
// Passes orgId, orgRole, sessionClaims, and db down the ctx chain.
export const authenticatedAction = actionClient.use(async ({ next }) => {
  const { userId, orgId, orgRole, sessionClaims } = await auth();

  if (!userId) {
    throw new ActionError("Unauthenticated: You must be signed in.");
  }

  return next({
    ctx: {
      userId,
      orgId: orgId ?? null,
      orgRole: orgRole ?? null,
      // Pass publicMetadata from session claims to avoid re-fetching auth()
      // in downstream middleware layers.
      publicMetadata: (sessionClaims as Record<string, unknown> | null)?.["public_metadata"] as
        Record<string, unknown> | undefined,
      db,
    },
  });
});

// ─── Vendor action ────────────────────────────────────────────────────────────
// Guarantees: user is a vendor, org:member, org:admin, or superadmin.
// Customers are explicitly rejected.
export const vendorAction = authenticatedAction.use(async ({ ctx, next }) => {
  const [role, isSuperAdmin] = await Promise.all([
    getCachedUserRole(ctx.userId),
    getCachedIsSuperAdmin(ctx.userId),
  ]);

  if (role === "customer") {
    throw new ActionError("Unauthorized: Customers cannot perform vendor actions.");
  }

  const isOrgVendor =
    ctx.orgId != null && (ctx.orgRole === "org:admin" || ctx.orgRole === "org:member");

  if (!isSuperAdmin && role !== "vendor" && !isOrgVendor) {
    throw new ActionError("Unauthorized: You do not have vendor permissions.");
  }

  return next({ ctx: { ...ctx, isSuperAdmin, userRole: role } });
});

// ─── Org-admin action ─────────────────────────────────────────────────────────
// Guarantees: user is org:admin of the active org OR a platform superadmin.
// Use for actions that a regular org:member must NOT perform (e.g., catalog delete).
export const orgAdminAction = vendorAction.use(async ({ ctx, next }) => {
  const isOrgAdmin = ctx.orgRole === "org:admin";
  const isSuperAdmin = ctx.isSuperAdmin;

  if (!isOrgAdmin && !isSuperAdmin) {
    throw new ActionError(
      "Unauthorized: Only organization administrators can perform this action.",
    );
  }

  return next({ ctx });
});

// ─── Platform superadmin action ───────────────────────────────────────────────
// Guarantees: user passes the dual-gate superadmin check
// (privateMetadata.platformRole === 'superadmin' AND userId in SUPERADMIN_USER_IDS env var).
export const superadminAction = authenticatedAction.use(async ({ ctx, next }) => {
  const client = await clerkClient();
  const user = await client.users.getUser(ctx.userId);

  if (!isSuperAdminUser(user)) {
    throw new ActionError("Unauthorized: Only global administrators can perform this action.");
  }

  return next({ ctx });
});
