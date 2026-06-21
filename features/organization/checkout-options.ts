import 'server-only';

import { createClerkClient } from '@clerk/nextjs/server';
import { unstable_cache } from 'next/cache';
import { getSystemSetting } from '@/shared/platform/settings';
import { logger } from '@/shared/logging/logger';
import {
  CHECKOUT_OPTIONS_CATALOG_KEY,
  parseCheckoutOptionsCatalog,
  isOrgOptionEnabled,
  type CheckoutOptionDefinition,
} from './checkout-options.shared';

export type {
  CheckoutOptionType,
  CheckoutOptionDefinition,
} from './checkout-options.shared';

export {
  CHECKOUT_OPTIONS_CATALOG_KEY,
  BUILTIN_CHECKOUT_OPTIONS,
  DEPRECATED_CHECKOUT_OPTION_IDS,
  parseCheckoutOptionsCatalog,
  buildCheckoutOptionsCatalogPayload,
  createCustomCheckoutOption,
  isOrgOptionEnabled,
} from './checkout-options.shared';

export async function getCheckoutOptionsCatalog(): Promise<CheckoutOptionDefinition[]> {
  const raw = await getSystemSetting(CHECKOUT_OPTIONS_CATALOG_KEY, '');
  return parseCheckoutOptionsCatalog(raw);
}

const fetchOrgCheckoutOptions = unstable_cache(
  async (orgId: string) => {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const meta = (org.publicMetadata || {}) as Record<string, unknown>;
    const checkoutOptions = meta.checkout_options;
    if (checkoutOptions && typeof checkoutOptions === 'object' && !Array.isArray(checkoutOptions)) {
      return checkoutOptions as Record<string, boolean>;
    }
    return {};
  },
  ['org-checkout-options'],
  { tags: ['org-checkout-options'], revalidate: 300 }
);

export async function getOrgCheckoutOptions(orgId: string): Promise<Record<string, boolean>> {
  try {
    return await fetchOrgCheckoutOptions(orgId);
  } catch (error) {
    logger.error('Failed to read org checkout options', error, { orgId });
    return {};
  }
}

export interface ResolvedCheckoutOptions {
  fulfillment: CheckoutOptionDefinition[];
  payment: CheckoutOptionDefinition[];
  pickupBranches: {
    orgId: string;
    branches: { id: string; name: string; address: string | null; phone: string | null }[];
  }[];
  singleVendorOrgId: string | null;
}

export async function resolveCheckoutOptionsForOrgs(
  orgIds: string[],
  branchesByOrg: Map<string, { id: string; name: string; address: string | null; phone: string | null }[]>
): Promise<ResolvedCheckoutOptions> {
  const catalog = await getCheckoutOptionsCatalog();
  const uniqueOrgIds = [...new Set(orgIds.filter(Boolean))];

  const orgOptionsList = await Promise.all(
    uniqueOrgIds.map(async (orgId) => ({
      orgId,
      options: await getOrgCheckoutOptions(orgId),
    }))
  );

  const platformEnabled = catalog.filter((o) => o.platformEnabled);
  const singleVendorOrgId = uniqueOrgIds.length === 1 ? uniqueOrgIds[0] : null;

  const fulfillment = platformEnabled.filter((option) => {
    if (option.type !== 'fulfillment') return false;
    if (option.requiresBranch) {
      if (uniqueOrgIds.length > 1) return false;
      const branches = singleVendorOrgId ? (branchesByOrg.get(singleVendorOrgId) || []) : [];
      if (branches.length === 0) return false;
    }
    return orgOptionsList.every(({ options }) => isOrgOptionEnabled(option, options));
  });

  const payment = platformEnabled.filter((option) => {
    if (option.type !== 'payment') return false;
    return orgOptionsList.every(({ options }) => isOrgOptionEnabled(option, options));
  });

  const pickupBranches: ResolvedCheckoutOptions['pickupBranches'] = [];

  if (singleVendorOrgId) {
    const branches = branchesByOrg.get(singleVendorOrgId) || [];
    if (branches.length > 0) {
      pickupBranches.push({ orgId: singleVendorOrgId, branches });
    }
  }

  return { fulfillment, payment, pickupBranches, singleVendorOrgId };
}
