export type PreorderType = "full_upfront" | "deposit" | "pay_later";

export interface PreorderConfig {
  isPreorder: boolean;
  preorderType: PreorderType;
  price: number; // Full retail price in minor units or base units
  depositAmount?: number | null;
  releaseDate?: Date | string | null;
  maxQuantity?: number | null;
  currentPreorderedCount?: number | null;
}

export interface PreorderCalculation {
  isPreorder: boolean;
  preorderType: PreorderType;
  upfrontAmountPerUnit: number;
  balanceDuePerUnit: number;
  totalPricePerUnit: number;
}

/**
 * Validates pre-order pricing & limits configuration.
 */
export function validatePreorderConfig(config: PreorderConfig): {
  valid: boolean;
  error?: string;
} {
  if (!config.isPreorder) {
    return { valid: true };
  }

  if (config.price < 0) {
    return { valid: false, error: "Price cannot be negative." };
  }

  if (config.preorderType === "deposit") {
    if (
      config.depositAmount === undefined ||
      config.depositAmount === null ||
      config.depositAmount <= 0
    ) {
      return {
        valid: false,
        error: "Deposit amount must be greater than zero for deposit-based pre-orders.",
      };
    }

    if (config.depositAmount > config.price) {
      return {
        valid: false,
        error: "Deposit amount cannot exceed the total product price.",
      };
    }
  }

  if (config.maxQuantity !== undefined && config.maxQuantity !== null && config.maxQuantity < 0) {
    return { valid: false, error: "Maximum pre-order quantity cannot be negative." };
  }

  return { valid: true };
}

/**
 * Calculates initial checkout payment and remaining balance due per unit based on pre-order type.
 */
export function calculatePreorderPayment(config: PreorderConfig): PreorderCalculation {
  if (!config.isPreorder) {
    return {
      isPreorder: false,
      preorderType: "full_upfront",
      upfrontAmountPerUnit: config.price,
      balanceDuePerUnit: 0,
      totalPricePerUnit: config.price,
    };
  }

  switch (config.preorderType) {
    case "deposit": {
      const deposit = Math.min(config.depositAmount ?? 0, config.price);
      return {
        isPreorder: true,
        preorderType: "deposit",
        upfrontAmountPerUnit: deposit,
        balanceDuePerUnit: Math.max(0, config.price - deposit),
        totalPricePerUnit: config.price,
      };
    }
    case "pay_later": {
      return {
        isPreorder: true,
        preorderType: "pay_later",
        upfrontAmountPerUnit: 0,
        balanceDuePerUnit: config.price,
        totalPricePerUnit: config.price,
      };
    }
    case "full_upfront":
    default: {
      return {
        isPreorder: true,
        preorderType: "full_upfront",
        upfrontAmountPerUnit: config.price,
        balanceDuePerUnit: 0,
        totalPricePerUnit: config.price,
      };
    }
  }
}

/**
 * Checks whether additional pre-order items can be accepted based on the max quantity limit.
 */
export function canAcceptPreorderQuantity(
  requestedQuantity: number,
  maxQuantity?: number | null,
  currentPreorderedCount?: number | null,
): { allowed: boolean; remainingSlots?: number | null } {
  if (maxQuantity === undefined || maxQuantity === null) {
    return { allowed: true, remainingSlots: null };
  }

  const current = currentPreorderedCount ?? 0;
  const remaining = Math.max(0, maxQuantity - current);

  if (requestedQuantity <= remaining) {
    return { allowed: true, remainingSlots: remaining };
  }

  return { allowed: false, remainingSlots: remaining };
}
