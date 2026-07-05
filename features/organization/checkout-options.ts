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
    
    let options: Record<string, boolean> = {};
    if (meta.checkout_options && typeof meta.checkout_options === 'object' && !Array.isArray(meta.checkout_options)) {
      options = meta.checkout_options as Record<string, boolean>;
    }
    
    const vendorMeta = (meta.vendor_metadata || {}) as any;
    
    const address = meta.address || vendorMeta.address;
    const phone = meta.phone || vendorMeta.phone;
    
    return {
      options,
      address: typeof address === 'string' ? address : null,
      phone: typeof phone === 'string' ? phone : null,
      name: org.name,
    };
  },
  ['org-checkout-options-v2'],
  { tags: ['org-checkout-options'], revalidate: 300 }
);

export async function getOrgCheckoutData(orgId: string) {
  try {
    return await fetchOrgCheckoutOptions(orgId);
  } catch (error) {
    logger.error('Failed to read org checkout data', error, { orgId });
    return { options: {}, address: null, phone: null, name: 'Unknown' };
  }
}

export async function getOrgCheckoutOptions(orgId: string): Promise<Record<string, boolean>> {
  const data = await getOrgCheckoutData(orgId);
  return data.options;
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
      data: await getOrgCheckoutData(orgId),
    }))
  );

  const platformEnabled = catalog.filter((o) => o.platformEnabled);
  const singleVendorOrgId = uniqueOrgIds.length === 1 ? uniqueOrgIds[0] : null;

  const fulfillment = platformEnabled.filter((option) => {
    if (option.type !== 'fulfillment') return false;
    if (option.requiresBranch) {
      if (uniqueOrgIds.length > 1) return false;
      if (!singleVendorOrgId) return false;

      const branches = branchesByOrg.get(singleVendorOrgId) || [];
      const orgData = orgOptionsList.find((o) => o.orgId === singleVendorOrgId)?.data;
      
      // Strict validation: Require at least one branch OR a public page address
      if (branches.length === 0 && (!orgData?.address || !orgData.address.trim())) {
        return false;
      }
    }
    return orgOptionsList.every(({ data }) => isOrgOptionEnabled(option, data.options));
  });

  const payment = platformEnabled.filter((option) => {
    if (option.type !== 'payment') return false;
    return orgOptionsList.every(({ data }) => isOrgOptionEnabled(option, data.options));
  });

  const pickupBranches: ResolvedCheckoutOptions['pickupBranches'] = [];

  if (singleVendorOrgId) {
    const branches = branchesByOrg.get(singleVendorOrgId) || [];
    if (branches.length > 0) {
      pickupBranches.push({ orgId: singleVendorOrgId, branches });
    } else {
      const orgData = orgOptionsList.find((o) => o.orgId === singleVendorOrgId)?.data;
      if (orgData?.address && orgData.address.trim()) {
        pickupBranches.push({
          orgId: singleVendorOrgId,
          branches: [
            {
              id: 'main_branch',
              name: 'Main Store',
              address: orgData.address,
              phone: orgData.phone || null,
            }
          ]
        });
      }
    }
  }

  return { fulfillment, payment, pickupBranches, singleVendorOrgId };
}
