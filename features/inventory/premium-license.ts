import 'server-only';

import { clerkClient, createClerkClient } from '@clerk/nextjs/server';
import { logger } from '@/shared/logging/logger';
import { unstable_cache, revalidateTag } from 'next/cache';

/** Default maximum active listings allowed for a free-tier organization. */
export const DEFAULT_MAX_LISTING_COUNT = 10;

/**
 * Premium IMS feature flags stored in Clerk Organization publicMetadata.
 * Set by the superadmin via the admin dashboard.
 */
export interface ImsLicenseFlags {
  /** Whether IMS is enabled for this org */
  imsEnabled: boolean;
  /** ISO timestamp — when IMS access expires (null = never) */
  imsExpiresAt: string | null;
  /** Whether multi-branch stock tracking is enabled */
  imsMultiBranchEnabled: boolean;
  /** Whether POS billing register is enabled */
  imsBillingEnabled: boolean;
  /**
   * Maximum number of active product/service listings this org may have.
   * Defaults to DEFAULT_MAX_LISTING_COUNT (10) when not set.
   */
  imsMaxListingCount: number;
}

/**
 * Resolved premium status after evaluating flags + expiration.
 */
export interface PremiumStatus {
  /** true if IMS is globally enabled AND not expired */
  imsActive: boolean;
  /** true if multi-branch capability is unlocked */
  multiBranchActive: boolean;
  /** true if billing/POS register is unlocked */
  billingActive: boolean;
  /** The raw expiration date (for display purposes) */
  expiresAt: Date | null;
  /** true if the license has expired */
  isExpired: boolean;
  /**
   * Resolved maximum active listing count for this org.
   * Superadmin can override; falls back to DEFAULT_MAX_LISTING_COUNT.
   */
  maxListingCount: number;
}

/**
 * Read the premium license flags from Clerk Organization publicMetadata
 * and resolve the effective access status.
 */
/**
 * Cached helper to load organization public metadata and verify premium status.
 */
const fetchRawStatus = unstable_cache(
  async (orgId: string) => {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const meta = (org.publicMetadata || {}) as Record<string, unknown>;

    const imsEnabled = meta.ims_enabled === true;
    const imsExpiresAtRaw = typeof meta.ims_expires_at === 'string' ? meta.ims_expires_at : null;
    const imsMultiBranchEnabled = meta.ims_multi_branch_enabled === true;
    const imsBillingEnabled = meta.ims_billing_enabled === true;

    // Resolve listing count limit — fall back to the platform default for free-tier orgs
    const rawMaxListing = meta.ims_max_listing_count;
    const maxListingCount =
      typeof rawMaxListing === 'number' && Number.isInteger(rawMaxListing) && rawMaxListing >= 1
        ? rawMaxListing
        : DEFAULT_MAX_LISTING_COUNT;

    // Evaluate expiration
    let isExpired = false;
    if (imsExpiresAtRaw) {
      const expiresAtDate = new Date(imsExpiresAtRaw);
      isExpired = expiresAtDate.getTime() < Date.now();
    }

    const imsActive = imsEnabled && !isExpired;

    return {
      imsActive,
      multiBranchActive: imsActive && imsMultiBranchEnabled,
      billingActive: imsActive && imsBillingEnabled,
      expiresAt: imsExpiresAtRaw,
      isExpired,
      maxListingCount,
    };
  },
  ['clerk-premium-status'],
  {
    tags: ['clerk-premium-status'],
    revalidate: 300, // Cache for 5 minutes
  }
);

export async function getPremiumStatus(orgId: string): Promise<PremiumStatus> {
  try {
    const raw = await fetchRawStatus(orgId);
    return {
      imsActive: raw.imsActive,
      multiBranchActive: raw.multiBranchActive,
      billingActive: raw.billingActive,
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : null,
      isExpired: raw.isExpired,
      maxListingCount: raw.maxListingCount,
    };
  } catch (error) {
    logger.error('Failed to read premium license status', error, { orgId });
    // Fail-closed: deny access if we can't verify.
    // maxListingCount falls back to the free-tier default to avoid undefined enforcement.
    return {
      imsActive: false,
      multiBranchActive: false,
      billingActive: false,
      expiresAt: null,
      isExpired: false,
      maxListingCount: DEFAULT_MAX_LISTING_COUNT,
    };
  }
}

/**
 * Update the IMS premium license flags on a Clerk Organization.
 * Only callable by superadmin actions.
 */
export async function updateOrgImsLicense(
  orgId: string,
  flags: Partial<ImsLicenseFlags>
): Promise<void> {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const existingMeta = (org.publicMetadata || {}) as Record<string, unknown>;

  const updatedMeta: Record<string, unknown> = { ...existingMeta };

  if (flags.imsEnabled !== undefined) {
    updatedMeta.ims_enabled = flags.imsEnabled;
  }
  if (flags.imsExpiresAt !== undefined) {
    updatedMeta.ims_expires_at = flags.imsExpiresAt;
  }
  if (flags.imsMultiBranchEnabled !== undefined) {
    updatedMeta.ims_multi_branch_enabled = flags.imsMultiBranchEnabled;
  }
  if (flags.imsBillingEnabled !== undefined) {
    updatedMeta.ims_billing_enabled = flags.imsBillingEnabled;
  }
  if (flags.imsMaxListingCount !== undefined) {
    updatedMeta.ims_max_listing_count = flags.imsMaxListingCount;
  }

  await client.organizations.updateOrganizationMetadata(orgId, {
    publicMetadata: updatedMeta,
  });

  revalidateTag('clerk-premium-status', 'max');
  revalidateTag('clerk-organizations', 'max');
}
