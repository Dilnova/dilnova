import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { inArray } from "drizzle-orm";
import { getStockAvailabilityCatalog } from "@/features/inventory/availability.server";
import {
  resolveCheckoutVendorOrgId,
  buildVendorCartSummaries,
} from "@/features/cart/vendor-checkout";
import { MULTI_VENDOR_ORDER_CHECKOUT_ERROR } from "@/features/orders/vendor-scope";
import { allocateVendorPaymentAmounts } from "@/features/billing/bank-transfer";
import {
  type BankTransferCheckoutInstructions,
  isBankTransferPayment,
} from "@/features/billing/bank-transfer";
import { buildBankTransferCheckoutInstructions } from "@/features/billing/bank-transfer.server";
import { sendOrderConfirmationEmailForOrder } from "@/features/orders/email/confirmation";
import { logger } from "@/shared/logging/logger";
import { DEFAULT_CURRENCY } from "@/shared/currency";
import type { VerifiedCheckoutItem } from "./checkout.types";

export async function validateAndPrepareCartItems(
  aggregatedItems: { id: string; quantity: number; price: number; name: string }[],
  checkoutVendorOrgIdInput: string | null,
) {
  const verifiedItems: VerifiedCheckoutItem[] = [];
  let serverSubtotal = 0;
  const availabilityCatalog = await getStockAvailabilityCatalog();

  const uniqueItemIds = [...new Set(aggregatedItems.map((item) => item.id))];
  const products =
    uniqueItemIds.length > 0
      ? await db
          .select({
            id: schema.products.id,
            name: schema.products.name,
            price: schema.products.price,
            currency: schema.products.currency,
            orgId: schema.products.orgId,
            type: schema.products.type,
            status: schema.products.status,
          })
          .from(schema.products)
          .where(inArray(schema.products.id, uniqueItemIds))
      : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of aggregatedItems) {
    const product = productMap.get(item.id);

    if (!product) {
      return { success: false as const, error: `Product not found in catalog: ${item.name}` };
    }
    if (product.status !== "active") {
      return {
        success: false as const,
        error: `"${product.name}" is no longer available for purchase.`,
      };
    }

    serverSubtotal += product.price * item.quantity;
    verifiedItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      vendorOrgId: product.orgId,
      type: product.type,
      vendorBaseCurrency: product.currency || DEFAULT_CURRENCY,
    });
  }

  let vendorOrgIds = [...new Set(verifiedItems.map((item) => item.vendorOrgId))];
  const resolvedCheckoutVendorOrgId = resolveCheckoutVendorOrgId(
    buildVendorCartSummaries(
      aggregatedItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      new Map(
        verifiedItems.map((item) => [
          item.id,
          { id: item.id, orgId: item.vendorOrgId, price: item.price },
        ]),
      ),
    ),
    checkoutVendorOrgIdInput,
  );

  if (vendorOrgIds.length > 1) {
    if (!resolvedCheckoutVendorOrgId) {
      return {
        success: false as const,
        error: MULTI_VENDOR_ORDER_CHECKOUT_ERROR,
      };
    }

    const filteredItems = verifiedItems.filter(
      (item) => item.vendorOrgId === resolvedCheckoutVendorOrgId,
    );
    if (filteredItems.length === 0) {
      return {
        success: false as const,
        error: "No items found for the selected vendor.",
      };
    }

    verifiedItems.splice(0, verifiedItems.length, ...filteredItems);
    serverSubtotal = filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    vendorOrgIds = [resolvedCheckoutVendorOrgId];
  }

  return {
    success: true as const,
    verifiedItems,
    serverSubtotal,
    vendorOrgIds,
    uniqueItemIds,
    availabilityCatalog,
  };
}

export async function processCheckoutSuccess(opts: {
  orderId: string;
  grandTotalCents: number;
  currency?: string;
  vendorSubtotals: Record<string, number>;
  serverSubtotalCents: number;
  payment: string;
  fulfillment: string;
  name: string;
  email: string;
  userId: string | null;
  selectedRateId?: string | null;
  vendorOrgId?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  } | null;
  items?: Array<{ id: string; quantity: number; weightGrams?: number | null }>;
}) {
  const {
    orderId: createdOrderId,
    grandTotalCents,
    currency,
    vendorSubtotals: createdVendorSubtotals,
    serverSubtotalCents,
    payment,
    fulfillment,
    name,
    email,
    userId,
    selectedRateId,
    vendorOrgId,
    shippingAddress,
    items,
  } = opts;

  // Create real carrier shipment label if delivery address is provided
  if (shippingAddress && shippingAddress.street && shippingAddress.city) {
    try {
      const { createOrderShipment } = await import("./fulfillment.service");
      await createOrderShipment({
        orderId: createdOrderId,
        vendorOrgId: vendorOrgId || Object.keys(createdVendorSubtotals)[0] || "default_vendor",
        selectedRateId,
        shippingAddress: {
          name,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state || "",
          postalCode: shippingAddress.postalCode || "",
          country: shippingAddress.country || "LK",
          phone: shippingAddress.phone,
        },
        items: items || [],
      });
    } catch (shipmentError) {
      logger.error("Failed to create shipment label during checkout", {
        orderId: createdOrderId,
        error: shipmentError instanceof Error ? shipmentError.message : String(shipmentError),
      });
    }
  }

  let bankTransferInstructions: BankTransferCheckoutInstructions | undefined;
  if (isBankTransferPayment(payment)) {
    const vendorAmounts = allocateVendorPaymentAmounts(
      createdVendorSubtotals,
      serverSubtotalCents,
      grandTotalCents,
    );
    bankTransferInstructions = await buildBankTransferCheckoutInstructions({
      orderId: createdOrderId,
      grandTotalCents,
      currency,
      vendorAmounts,
    });
  }

  const emailResult = await sendOrderConfirmationEmailForOrder(createdOrderId, {
    customerName: name,
    customerEmail: email,
    paymentMethod: payment,
    fulfillmentMethod: fulfillment,
    bankTransferInstructions,
    isSignedIn: Boolean(userId),
  });

  if (!emailResult.success) {
    logger.warn("Order placed but confirmation email was not sent", {
      orderId: createdOrderId,
      error: emailResult.error,
    });
  }

  // ── Vendor Notifications (Web-First / Email Fallback) ──
  const { dispatchVendorOrderNotifications } =
    await import("@/features/orders/vendor-notification");
  await dispatchVendorOrderNotifications(createdOrderId);

  logger.info("Checkout succeeded", {
    orderId: createdOrderId,
    grandTotalCents,
    paymentMethod: payment,
    fulfillmentMethod: fulfillment,
  });

  return {
    success: true as const,
    orderId: createdOrderId,
    bankTransferInstructions,
    confirmationEmailSent: emailResult.success,
  };
}
