import { logger } from '@/shared/logging/logger';

export function validateFulfillment(opts: {
  fulfillmentOption: any;
  pickupBranch: string | null;
  vendorOrgIds: string[];
  branchRows: any[];
  branchesByOrg: Map<string, any[]>;
  uniqueItemIds: string[];
}) {
  const {
    fulfillmentOption,
    pickupBranch,
    vendorOrgIds,
    branchRows,
    branchesByOrg,
    uniqueItemIds,
  } = opts;

  if (fulfillmentOption.requiresBranch) {
    if (!pickupBranch) {
      return { success: false, error: 'Please select a pickup branch to continue.' };
    }
    let validBranch = branchRows.find(
      (branch) => branch.id === pickupBranch && vendorOrgIds.includes(branch.orgId)
    );

    // Virtual branch bypass for vendors with 0 explicit branches
    if (!validBranch && pickupBranch === 'main_branch' && vendorOrgIds.length === 1) {
      const orgBranchesLength = branchesByOrg.get(vendorOrgIds[0])?.length || 0;
      if (orgBranchesLength === 0) {
        validBranch = { id: 'main_branch', orgId: vendorOrgIds[0] } as any;
      }
    }

    if (!validBranch) {
      logger.warn('Checkout business validation failed', {
        reason: 'Invalid pickup branch',
        pickupBranch,
        vendorOrgIds,
        cartItems: uniqueItemIds,
      });
      return { success: false, error: 'Selected pickup branch is invalid.' };
    }
    if (vendorOrgIds.length > 1) {
      logger.warn('Checkout business validation failed', {
        reason: 'Multi-vendor store pickup',
        vendorOrgIds,
        cartItems: uniqueItemIds,
      });
      return {
        success: false,
        error: 'Store pickup is only available when all items are from the same vendor.',
      };
    }
  } else if (pickupBranch) {
    return { success: false, error: 'Pickup branch is only required for store pickup orders.' };
  }

  return { success: true };
}

export function validateShippingAddress(opts: {
  fulfillmentOption: any;
  normalizedShippingAddress: string | null;
  normalizedShippingCity: string | null;
  normalizedShippingState: string | null;
  normalizedShippingPostalCode: string | null;
  normalizedShippingCountry: string | null;
  normalizedShippingPhone: string | null;
}) {
  const {
    fulfillmentOption,
    normalizedShippingAddress,
    normalizedShippingCity,
    normalizedShippingState,
    normalizedShippingPostalCode,
    normalizedShippingCountry,
    normalizedShippingPhone,
  } = opts;

  if (!fulfillmentOption.requiresBranch) {
    if (
      !normalizedShippingAddress ||
      normalizedShippingAddress.length < 5 ||
      !normalizedShippingCity ||
      !normalizedShippingState ||
      !normalizedShippingPostalCode ||
      !normalizedShippingCountry
    ) {
      return {
        success: false,
        error:
          'Please enter a complete delivery address for home delivery orders (Street, City, State, Postal Code, and Country are required).',
      };
    }
  } else if (normalizedShippingAddress || normalizedShippingPhone) {
    return {
      success: false,
      error: 'Shipping address is only required for home delivery orders.',
    };
  }
  return { success: true };
}
