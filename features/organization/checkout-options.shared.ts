export const CHECKOUT_OPTIONS_CATALOG_KEY = 'checkout_options_catalog';

/** Removed payment methods — filtered from catalog reads and org settings */
export const DEPRECATED_CHECKOUT_OPTION_IDS = new Set(['pay_online']);

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
  /** Payment options that create orders awaiting payment (e.g. COD) */
  pendingPayment?: boolean;
  /** Payment only allowed with delivery fulfillment (not store pickup) */
  requiresDelivery?: boolean;
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
    pendingPayment: true,
    requiresDelivery: true,
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Transfer payment to the vendor bank account. Order is confirmed after payment is verified.',
    type: 'payment',
    platformEnabled: true,
    isBuiltIn: true,
    pendingPayment: true,
  },
];

const BUILTIN_DEFAULTS: Record<string, boolean> = {
  standard_delivery: false,
  store_pickup: true,
  cash_on_delivery: false,
  bank_transfer: true,
};

function isDeprecatedCheckoutOptionId(id: string): boolean {
  return DEPRECATED_CHECKOUT_OPTION_IDS.has(id);
}

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
      if (!option?.id || builtinById.has(option.id) || isDeprecatedCheckoutOptionId(option.id)) continue;
      merged.push({
        id: option.id,
        label: option.label || option.id,
        description: option.description,
        type: option.type === 'payment' ? 'payment' : 'fulfillment',
        platformEnabled: option.platformEnabled !== false,
        isBuiltIn: false,
        zeroShipping: option.zeroShipping === true,
        requiresBranch: option.requiresBranch === true,
        pendingPayment: option.pendingPayment === true,
        requiresDelivery: option.requiresDelivery === true,
      });
    }

    return merged.filter((option) => !isDeprecatedCheckoutOptionId(option.id));
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
  return options
    .filter((option) => !isDeprecatedCheckoutOptionId(option.id))
    .map((option) => ({
    id: option.id,
    label: option.label.trim(),
    description: option.description?.trim(),
    type: option.type,
    platformEnabled: option.platformEnabled,
    isBuiltIn: option.isBuiltIn === true,
    zeroShipping: option.zeroShipping === true,
    requiresBranch: option.requiresBranch === true,
    pendingPayment: option.pendingPayment === true,
    requiresDelivery: option.requiresDelivery === true,
  }));
}

export function getCheckoutOptionLabel(
  catalog: CheckoutOptionDefinition[],
  optionId: string
): string {
  const option = catalog.find((o) => o.id === optionId);
  if (option) return option.label;
  return optionId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isPaymentCompatibleWithFulfillment(
  payment: Pick<CheckoutOptionDefinition, 'requiresDelivery'>,
  fulfillment: Pick<CheckoutOptionDefinition, 'requiresBranch'>
): boolean {
  if (payment.requiresDelivery && fulfillment.requiresBranch) return false;
  return true;
}

export function describeOrderCheckout(
  order: {
    fulfillmentMethod: string;
    paymentMethod: string;
    pickupBranchId?: string | null;
    pickupBranchName?: string | null;
  },
  catalog: CheckoutOptionDefinition[]
): { fulfillment: string; payment: string; pickup?: string } {
  const fulfillment = getCheckoutOptionLabel(catalog, order.fulfillmentMethod);
  const payment = getCheckoutOptionLabel(catalog, order.paymentMethod);
  const fulfillmentOption = catalog.find((o) => o.id === order.fulfillmentMethod);
  const pickup =
    fulfillmentOption?.requiresBranch && order.pickupBranchId
      ? order.pickupBranchName || `Branch ${order.pickupBranchId.slice(0, 8)}`
      : undefined;
  return { fulfillment, payment, pickup };
}

export function resolveInitialOrderStatus(
  paymentOption: CheckoutOptionDefinition
): 'pending' | 'pending_payment' {
  return paymentOption.pendingPayment === true ? 'pending_payment' : 'pending';
}

export function createCustomCheckoutOption(
  label: string,
  type: CheckoutOptionType,
  existingIds: string[]
): CheckoutOptionDefinition {
  const baseId = slugifyOptionId(label) || 'custom_option';
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
