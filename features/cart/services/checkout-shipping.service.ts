import { logger } from "@/shared/logging/logger";
import type { VerifiedCheckoutItem } from "./checkout.types";

export interface ShippingBranchInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

export interface ShippingDestinationInput {
  name: string;
  street: string | null;
  city: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface ShippingRateCalculationResult {
  serverShippingCents: number;
  shippingCalculationError: string | null;
}

export interface ShippingFeeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that the submitted shipping fee conforms to fail-closed rules and falls
 * within an allowable boundary (50% to 500% of the computed base rate).
 */
export function validateCheckoutShippingFee(opts: {
  zeroShipping: boolean;
  serverShippingCents: number;
  clientShippingCents: number;
  calculationFailed?: boolean;
}): ShippingFeeValidationResult {
  if (opts.zeroShipping) {
    return { valid: true };
  }

  if (opts.calculationFailed || opts.serverShippingCents <= 0) {
    return {
      valid: false,
      error:
        "Unable to calculate shipping rates for the delivery address. Please verify your address or select another fulfillment option.",
    };
  }

  if (opts.clientShippingCents === 0) {
    return {
      valid: false,
      error:
        "Checkout total mismatch: no shipping fee was submitted but shipping is required. Please refresh your cart and try again.",
    };
  }

  const minAcceptableShipping = Math.floor(opts.serverShippingCents * 0.5);
  const maxAcceptableShipping = Math.ceil(opts.serverShippingCents * 5);

  if (
    opts.clientShippingCents < minAcceptableShipping ||
    opts.clientShippingCents > maxAcceptableShipping
  ) {
    return {
      valid: false,
      error:
        "Checkout total mismatch: submitted shipping fee is outside the allowable range for this delivery. Please refresh your cart and select a shipping method.",
    };
  }

  return { valid: true };
}

/**
 * Computes multi-vendor dynamic shipping rates using the rate engine.
 */
export async function calculateMultiVendorShippingRates(opts: {
  verifiedItems: VerifiedCheckoutItem[];
  branchesByOrg: Map<string, ShippingBranchInfo[]>;
  destination: {
    name: string;
    street: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
}): Promise<ShippingRateCalculationResult> {
  try {
    const { computeMultiVendorRates } = await import("@/shared/shipping/rate-engine");

    const itemsByVendor = new Map<
      string,
      Array<{ id: string; quantity: number; weightGrams?: number }>
    >();
    for (const item of opts.verifiedItems) {
      const list = itemsByVendor.get(item.vendorOrgId) ?? [];
      list.push({ id: item.id, quantity: item.quantity, weightGrams: 500 });
      itemsByVendor.set(item.vendorOrgId, list);
    }

    const vendorBranchMap = new Map<string, ShippingBranchInfo>();
    for (const [orgId, branchList] of opts.branchesByOrg.entries()) {
      const mainBranch = branchList[0];
      if (mainBranch) {
        vendorBranchMap.set(orgId, mainBranch);
      }
    }

    const rateResult = await computeMultiVendorRates({
      itemsByVendor,
      destination: {
        name: opts.destination.name,
        street: opts.destination.street || "Delivery Address",
        city: opts.destination.city,
        state: opts.destination.state || "",
        postalCode: opts.destination.postalCode || "",
        country: opts.destination.country || "LK",
      },
      vendorBranchMap,
    });

    return {
      serverShippingCents: rateResult.totalShippingCents,
      shippingCalculationError: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      "[calculateMultiVendorShippingRates] Dynamic shipping rate calculation failed, fail closed",
      { error: err },
    );
    return {
      serverShippingCents: 0,
      shippingCalculationError: message,
    };
  }
}

/**
 * High-level helper that calculates dynamic shipping rates if required, derives the client
 * shipping fee, and verifies it against fail-closed boundaries.
 */
export async function calculateAndValidateCheckoutShipping(opts: {
  zeroShipping: boolean;
  verifiedItems: VerifiedCheckoutItem[];
  branchesByOrg: Map<string, ShippingBranchInfo[]>;
  destination: ShippingDestinationInput;
  clientGrandTotal: number;
  serverSubtotal: number;
  totalTaxCents: number;
}): Promise<
  | { success: true; serverShippingCents: number; clientShippingCents: number }
  | { success: false; error: string }
> {
  let serverShippingCents = 0;
  let shippingCalculationError: string | null = null;

  if (!opts.zeroShipping && opts.destination.city) {
    const calcResult = await calculateMultiVendorShippingRates({
      verifiedItems: opts.verifiedItems,
      branchesByOrg: opts.branchesByOrg,
      destination: {
        name: opts.destination.name,
        street: opts.destination.street,
        city: opts.destination.city,
        state: opts.destination.state,
        postalCode: opts.destination.postalCode,
        country: opts.destination.country,
      },
    });
    serverShippingCents = calcResult.serverShippingCents;
    shippingCalculationError = calcResult.shippingCalculationError;
  }

  const clientShippingCents = Math.max(
    0,
    opts.clientGrandTotal - (opts.serverSubtotal + opts.totalTaxCents),
  );

  const validation = validateCheckoutShippingFee({
    zeroShipping: opts.zeroShipping,
    serverShippingCents,
    clientShippingCents,
    calculationFailed: Boolean(shippingCalculationError),
  });

  if (!validation.valid) {
    return { success: false, error: validation.error! };
  }

  return {
    success: true,
    serverShippingCents,
    clientShippingCents,
  };
}
