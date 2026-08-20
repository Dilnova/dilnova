import { logger } from "@/shared/logging/logger";
import type { CheckoutOptionDefinition } from "@/features/organization/checkout-options.shared";
import type { BranchRow } from "./checkout.types";

export function validateFulfillment(opts: {
  fulfillmentOption: CheckoutOptionDefinition;
  pickupBranch: string | null;
  vendorOrgIds: string[];
  branchRows: BranchRow[];
  branchesByOrg: Map<string, Omit<BranchRow, "orgId">[]>;
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
      return { success: false, error: "Please select a pickup branch to continue." };
    }
    let validBranch = branchRows.find(
      (branch) => branch.id === pickupBranch && vendorOrgIds.includes(branch.orgId),
    );

    // Virtual branch bypass for vendors with 0 explicit branches
    if (!validBranch && pickupBranch === "main_branch" && vendorOrgIds.length === 1) {
      const orgBranchesLength = branchesByOrg.get(vendorOrgIds[0])?.length || 0;
      if (orgBranchesLength === 0) {
        validBranch = {
          id: "main_branch",
          orgId: vendorOrgIds[0],
          name: "Main Branch",
          address: null,
          phone: null,
        };
      }
    }

    if (!validBranch) {
      logger.warn("Checkout business validation failed", {
        reason: "Invalid pickup branch",
        pickupBranch,
        vendorOrgIds,
        cartItems: uniqueItemIds,
      });
      return { success: false, error: "Selected pickup branch is invalid." };
    }
    if (vendorOrgIds.length > 1) {
      logger.warn("Checkout business validation failed", {
        reason: "Multi-vendor store pickup",
        vendorOrgIds,
        cartItems: uniqueItemIds,
      });
      return {
        success: false,
        error: "Store pickup is only available when all items are from the same vendor.",
      };
    }
  } else if (pickupBranch) {
    return { success: false, error: "Pickup branch is only required for store pickup orders." };
  }

  return { success: true };
}

export function validateShippingAddress(opts: {
  fulfillmentOption: CheckoutOptionDefinition;
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
    if (!normalizedShippingAddress || normalizedShippingAddress.trim().length < 5) {
      return {
        success: false,
        error: "Please enter a valid street address (minimum 5 characters).",
      };
    }
    if (!normalizedShippingState || !normalizedShippingState.trim()) {
      return {
        success: false,
        error: "Please select or enter your District / State.",
      };
    }
    if (!normalizedShippingCity || !normalizedShippingCity.trim()) {
      return {
        success: false,
        error: "Please select or enter your City / Town.",
      };
    }
    if (!normalizedShippingPostalCode || !normalizedShippingPostalCode.trim()) {
      return {
        success: false,
        error: "Please enter your Postal / ZIP Code.",
      };
    }
    if (!normalizedShippingCountry || !normalizedShippingCountry.trim()) {
      return {
        success: false,
        error: "Please select your Country.",
      };
    }
  } else if (normalizedShippingAddress || normalizedShippingPhone) {
    return {
      success: false,
      error: "Shipping address is only required for home delivery orders.",
    };
  }
  return { success: true };
}

export async function createOrderShipment(opts: {
  orderId: string;
  vendorOrgId: string;
  selectedRateId?: string | null;
  originBranchId?: string | null;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: Array<{ id: string; quantity: number; weightGrams?: number | null }>;
}) {
  const { orderId, vendorOrgId, selectedRateId, originBranchId, shippingAddress, items } = opts;

  try {
    const { db } = await import("@/shared/db/client");
    const { shipments, branches } = await import("@/shared/db/schema");
    const { getCarrier } = await import("@/shared/shipping/carrier-registry");
    const { parseBranchToOrigin, consolidateParcels } =
      await import("@/shared/shipping/rate-engine");
    const { eq } = await import("drizzle-orm");

    // 1. Fetch vendor origin branch (prefer specific originBranchId, fallback to default branch)
    let vendorBranch;
    if (originBranchId) {
      [vendorBranch] = await db
        .select({
          id: branches.id,
          name: branches.name,
          address: branches.address,
          phone: branches.phone,
        })
        .from(branches)
        .where(eq(branches.id, originBranchId))
        .limit(1);
    }
    if (!vendorBranch) {
      [vendorBranch] = await db
        .select({
          id: branches.id,
          name: branches.name,
          address: branches.address,
          phone: branches.phone,
        })
        .from(branches)
        .where(eq(branches.orgId, vendorOrgId))
        .limit(1);
    }

    const origin = parseBranchToOrigin(vendorBranch);
    const destination = {
      name: shippingAddress.name,
      street: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
      phone: shippingAddress.phone,
    };

    const parcel = consolidateParcels(items);
    const rateId = selectedRateId || "slpost_domestic_parcel";

    // Determine carrier adapter from rateId prefix
    let carrierId = "slpost";
    if (rateId.startsWith("easypost_")) carrierId = "easypost";
    else if (rateId.startsWith("shippo_")) carrierId = "shippo";
    else if (rateId.startsWith("builtin_")) carrierId = "builtin";

    const carrier = getCarrier(carrierId);
    const result = await carrier.createShipment(origin, destination, [parcel], rateId);

    const [shipmentRecord] = await db
      .insert(shipments)
      .values({
        orderId,
        vendorOrgId,
        originBranchId: vendorBranch?.id ?? null,
        carrierName: carrier.name,
        shipmentExternalId: result.shipmentExternalId,
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        labelUrl: result.labelUrl,
        status: "label_created",
        shippingService: rateId,
        estimatedDeliveryDate: result.estimatedDeliveryDate,
        weightGrams: parcel.weightGrams,
        events: [
          {
            status: "label_created",
            description: `Shipment label created via ${carrier.name}`,
            location: origin.city,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      .returning();

    // Also update order record with tracking metadata
    const { simulatedOrders } = await import("@/shared/db/schema");
    await db
      .update(simulatedOrders)
      .set({
        carrierName: carrier.name,
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        labelUrl: result.labelUrl,
        shipmentExternalId: result.shipmentExternalId,
        shippingService: rateId,
        estimatedDeliveryDate: result.estimatedDeliveryDate,
        updatedAt: new Date(),
      })
      .where(eq(simulatedOrders.id, orderId));

    logger.info("[createOrderShipment] Created shipment label for order", {
      orderId,
      trackingNumber: result.trackingNumber,
      carrierName: carrier.name,
    });

    return { success: true, shipment: shipmentRecord };
  } catch (error) {
    logger.error("[createOrderShipment] Failed to create shipment label", {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Shipment label creation failed",
    };
  }
}
