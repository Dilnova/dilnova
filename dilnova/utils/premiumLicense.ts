'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { logger } from './logger';

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
}

/**
 * Read the premium license flags from Clerk Organization publicMetadata
 * and resolve the effective access status.
 */
export async function getPremiumStatus(orgId: string): Promise<PremiumStatus> {
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const meta = (org.publicMetadata || {}) as Record<string, unknown>;

    const imsEnabled = meta.ims_enabled === true;
    const imsExpiresAtRaw = typeof meta.ims_expires_at === 'string' ? meta.ims_expires_at : null;
    const imsMultiBranchEnabled = meta.ims_multi_branch_enabled === true;
    const imsBillingEnabled = meta.ims_billing_enabled === true;

    // Evaluate expiration
    let isExpired = false;
    let expiresAt: Date | null = null;
    if (imsExpiresAtRaw) {
      expiresAt = new Date(imsExpiresAtRaw);
      isExpired = expiresAt.getTime() < Date.now();
    }

    const imsActive = imsEnabled && !isExpired;

    return {
      imsActive,
      multiBranchActive: imsActive && imsMultiBranchEnabled,
      billingActive: imsActive && imsBillingEnabled,
      expiresAt,
      isExpired,
    };
  } catch (error) {
    logger.error('Failed to read premium license status', error, { orgId });
    // Fail-closed: deny access if we can't verify
    return {
      imsActive: false,
      multiBranchActive: false,
      billingActive: false,
      expiresAt: null,
      isExpired: false,
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

  await client.organizations.updateOrganization(orgId, {
    publicMetadata: updatedMeta,
  });
}
