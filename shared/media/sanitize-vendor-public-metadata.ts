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
>;

/** Removes bank transfer fields and non-storefront keys before client-facing org props. */
export function sanitizeVendorPublicMetadata(
  metadata: Record<string, unknown> | null | undefined
): StorefrontPublicMetadata {
  const stripped = stripBankFieldsFromPublic((metadata || {}) as Record<string, unknown>);
  const safe: StorefrontPublicMetadata = {};

  for (const key of STOREFRONT_PUBLIC_KEYS) {
    const value = stripped[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      safe[key] = value;
    }
  }

  return safe;
}
