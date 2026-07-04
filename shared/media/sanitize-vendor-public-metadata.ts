import { stripBankFieldsFromPublic } from '@/features/billing/bank-transfer-metadata';

const STOREFRONT_PUBLIC_KEYS = [
  'description',
  'address',
  'phone',
  'bannerUrl',
  'theme',
  'stockAllocationMode',
] as const;

export type StorefrontPublicMetadata = Partial<
  Record<(typeof STOREFRONT_PUBLIC_KEYS)[number], string>
> & {
  ims_enabled?: boolean;
  ims_expires_at?: string | null;
  ims_multi_branch_enabled?: boolean;
  ims_billing_enabled?: boolean;
};

/** Removes bank transfer fields and non-storefront keys before client-facing org props. */
export function sanitizeVendorPublicMetadata(
  metadata: Record<string, unknown> | null | undefined
): StorefrontPublicMetadata {
  const stripped = stripBankFieldsFromPublic((metadata || {}) as Record<string, unknown>);
  const safe: StorefrontPublicMetadata = {};

  for (const key of STOREFRONT_PUBLIC_KEYS) {
    const value = stripped[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      safe[key] = value as string;
    }
  }

  if (typeof stripped.ims_enabled === 'boolean') {
    safe.ims_enabled = stripped.ims_enabled;
  }
  if (typeof stripped.ims_expires_at === 'string' || stripped.ims_expires_at === null) {
    safe.ims_expires_at = stripped.ims_expires_at as string | null;
  }
  if (typeof stripped.ims_multi_branch_enabled === 'boolean') {
    safe.ims_multi_branch_enabled = stripped.ims_multi_branch_enabled;
  }
  if (typeof stripped.ims_billing_enabled === 'boolean') {
    safe.ims_billing_enabled = stripped.ims_billing_enabled;
  }

  return safe;
}
