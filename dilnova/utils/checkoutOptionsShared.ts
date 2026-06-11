export const CHECKOUT_OPTIONS_CATALOG_KEY = 'checkout_options_catalog';

export type CheckoutOptionType = 'fulfillment' | 'payment';

export interface CheckoutOptionDefinition {
  id: string;
  label: string;
  description?: string;
  type: CheckoutOptionType;
  platformEnabled: boolean;
  isBuiltIn?: boolean;
  zeroShipping?: boolean;
  requiresBranch?: boolean;
}

export const BUILTIN_CHECKOUT_OPTIONS: CheckoutOptionDefinition[] = [
  {
    id: 'standard_delivery',
    label: 'Home Delivery',
    description: 'Deliver to your address',
    type: 'fulfillment',
    platformEnabled: true,
    isBuiltIn: true,
    zeroShipping: false,
  },
  {
    id: 'store_pickup',
    label: 'Store Pickup',
    description: 'Collect your order from a store branch',
    type: 'fulfillment',
    platformEnabled: true,
    isBuiltIn: true,
    zeroShipping: true,
    requiresBranch: true,
  },
  {
    id: 'cash_on_delivery',
    label: 'Cash on Delivery',
    description: 'Pay with cash when your order arrives',
    type: 'payment',
    platformEnabled: true,
    isBuiltIn: true,
  },
  {
    id: 'pay_online',
    label: 'Pay Online',
    description: 'Simulated online payment',
    type: 'payment',
    platformEnabled: true,
    isBuiltIn: true,
  },
];

const BUILTIN_DEFAULTS: Record<string, boolean> = {
  standard_delivery: true,
  pay_online: true,
  store_pickup: false,
  cash_on_delivery: false,
};

function slugifyOptionId(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

export function parseCheckoutOptionsCatalog(raw: string | null | undefined): CheckoutOptionDefinition[] {
  if (!raw) return [...BUILTIN_CHECKOUT_OPTIONS];

  try {
    const parsed = JSON.parse(raw) as CheckoutOptionDefinition[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...BUILTIN_CHECKOUT_OPTIONS];
    }

    const builtinById = new Map(BUILTIN_CHECKOUT_OPTIONS.map((o) => [o.id, o]));
    const merged: CheckoutOptionDefinition[] = [];

    for (const builtin of BUILTIN_CHECKOUT_OPTIONS) {
      const fromDb = parsed.find((o) => o.id === builtin.id);
      merged.push(fromDb ? { ...builtin, ...fromDb, isBuiltIn: true } : { ...builtin });
    }

    for (const option of parsed) {
      if (!option?.id || builtinById.has(option.id)) continue;
      merged.push({
        id: option.id,
        label: option.label || option.id,
        description: option.description,
        type: option.type === 'payment' ? 'payment' : 'fulfillment',
        platformEnabled: option.platformEnabled !== false,
        isBuiltIn: false,
        zeroShipping: option.zeroShipping === true,
        requiresBranch: option.requiresBranch === true,
      });
    }

    return merged;
  } catch {
    return [...BUILTIN_CHECKOUT_OPTIONS];
  }
}

export function isOrgOptionEnabled(
  option: CheckoutOptionDefinition,
  orgCheckoutOptions: Record<string, boolean> | undefined
): boolean {
  if (!option.platformEnabled) return false;
  if (orgCheckoutOptions && option.id in orgCheckoutOptions) {
    return orgCheckoutOptions[option.id] === true;
  }
  return BUILTIN_DEFAULTS[option.id] ?? false;
}

export function buildCheckoutOptionsCatalogPayload(
  options: CheckoutOptionDefinition[]
): CheckoutOptionDefinition[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label.trim(),
    description: option.description?.trim(),
    type: option.type,
    platformEnabled: option.platformEnabled,
    isBuiltIn: option.isBuiltIn === true,
    zeroShipping: option.zeroShipping === true,
    requiresBranch: option.requiresBranch === true,
  }));
}

export function createCustomCheckoutOption(
  label: string,
  type: CheckoutOptionType,
  existingIds: string[]
): CheckoutOptionDefinition {
  let baseId = slugifyOptionId(label) || 'custom_option';
  let id = baseId;
  let counter = 1;
  while (existingIds.includes(id)) {
    id = `${baseId}_${counter}`;
    counter += 1;
  }

  return {
    id,
    label: label.trim(),
    type,
    platformEnabled: true,
    isBuiltIn: false,
    zeroShipping: false,
    requiresBranch: false,
  };
}
