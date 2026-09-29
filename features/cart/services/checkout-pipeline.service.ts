import { currentUser } from "@clerk/nextjs/server";
import { rateLimit } from "@/shared/security/rate-limit";
import { getNormalizedClerkUserEmail } from "@/features/customer/email";
import { resolveInitialOrderStatus } from "@/features/organization/checkout-options.shared";
import { resolveCheckoutOptionsForOrgs } from "@/features/organization/checkout-options";
import { calculateCheckoutTotals } from "@/features/billing/checkout-totals";
import { buildCartTaxBreakdown } from "@/features/billing/tax-engine";
import {
  isBankTransferPayment,
  type BankTransferCheckoutInstructions,
} from "@/features/billing/bank-transfer";
import { getBankTransferDetailsForOrgs } from "@/features/billing/bank-transfer.server";
import { aggregateCheckoutItems } from "@/features/cart/checkout.helpers";
import { DEFAULT_CURRENCY } from "@/shared/currency";
import type { CheckoutInput } from "@/features/cart/schema";
import {
  acquireIdempotencyLock,
  completeIdempotency,
  releaseIdempotencyLock,
  generateRequestFingerprint,
} from "@/shared/security/idempotency";
import { logger } from "@/shared/logging/logger";

import { validateFulfillment, validateShippingAddress } from "./fulfillment.service";
import { validatePayment } from "./payment.service";
import { executeCheckoutWithRetry } from "./checkout-transaction.service";
import { validateAndPrepareCartItems, processCheckoutSuccess } from "./checkout-validation.service";
import { fetchBranchesForOrgs } from "./checkout-options.service";
import { calculateAndValidateCheckoutShipping } from "./checkout-shipping.service";

export type SimulatedCheckoutInput = Omit<CheckoutInput, "idempotencyKey"> & {
  idempotencyKey?: string | null;
};

export type SimulatedCheckoutResult =
  | { success: false; error: string }
  | {
      success: true;
      orderId: string;
      bankTransferInstructions?: BankTransferCheckoutInstructions | null;
      confirmationEmailSent: boolean;
    };

/**
 * Orchestrates the full customer simulated checkout lifecycle:
 * 1. Authentication & normalized email validation
 * 2. Client-level idempotency lock acquisition & double-submit prevention
 * 3. Rate limiting (fail-closed)
 * 4. Cart integrity, catalog availability, and single-vendor constraints
 * 5. Multi-org branch and checkout option resolution
 * 6. Payment, fulfillment, and shipping address validation
 * 7. Dynamic tax breakdown computation
 * 8. Multi-vendor carrier rate calculation and boundary validation
 * 9. Grand total verification against client-submitted amounts
 * 10. Idempotent DB transaction with exponential backoff retries
 * 11. Post-order carrier label, confirmation email, vendor notification dispatch, and idempotency completion
 */
export async function executeSimulatedCheckout(
  input: SimulatedCheckoutInput,
  ctx: { userId: string },
): Promise<SimulatedCheckoutResult> {
  let name = input.customerName.trim();
  const aggregatedItems = aggregateCheckoutItems(input.items);
  const {
    totalAmount: clientGrandTotal,
    fulfillmentMethod: fulfillment,
    paymentMethod: payment,
    pickupBranchId: pickupBranch,
    shippingAddress: shippingAddressInput,
    shippingAddressLine2: shippingAddressLine2Input,
    shippingCity: shippingCityInput,
    shippingState: shippingStateInput,
    shippingPostalCode: shippingPostalCodeInput,
    shippingCountry: shippingCountryInput,
    shippingPhone: shippingPhoneInput,
    shippingPhone2: shippingPhone2Input,
    checkoutVendorOrgId: checkoutVendorOrgIdInput,
    idempotencyKey,
  } = input;

  // 1. Session verification
  const user = await currentUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication session is invalid. Please sign in again.",
    };
  }

  const sessionEmail = getNormalizedClerkUserEmail(user);
  if (!sessionEmail) {
    return {
      success: false,
      error:
        "Your account does not have an email address. Please update your profile before checkout.",
    };
  }
  const email = sessionEmail;
  name = user.fullName || user.firstName || name;

  // 2. Client-level Idempotency Enforcement & Double-Submit Protection
  const effectiveIdempotencyKey =
    idempotencyKey?.trim() ||
    generateRequestFingerprint(ctx.userId, {
      items: aggregatedItems.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price })),
      totalAmount: clientGrandTotal,
      fulfillment,
      payment,
      pickupBranch,
      shippingAddress: shippingAddressInput,
    });

  const { isAcquired, existingRecord } = await acquireIdempotencyLock(effectiveIdempotencyKey, 60);

  if (!isAcquired) {
    if (existingRecord?.status === "completed" && existingRecord.data) {
      logger.info(
        "[checkout-pipeline] Returning cached order result for completed idempotent checkout",
        {
          key: effectiveIdempotencyKey,
        },
      );
      return existingRecord.data as SimulatedCheckoutResult;
    }

    return {
      success: false,
      error: "This order is already being processed. Please wait or refresh the page.",
    };
  }

  try {
    // 3. Rate limiting
    await rateLimit(5, 60 * 1000, ctx.userId, { failClosed: true });

    // 4. Cart item verification
    const validationResult = await validateAndPrepareCartItems(
      aggregatedItems,
      checkoutVendorOrgIdInput || null,
    );

    if (!validationResult.success) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return { success: false, error: validationResult.error! };
    }

    const { verifiedItems, serverSubtotal, vendorOrgIds, uniqueItemIds, availabilityCatalog } =
      validationResult;

    // 5. Branch and checkout options resolution
    const { branchRows, branchesByOrg } = await fetchBranchesForOrgs(vendorOrgIds);
    const resolvedOptions = await resolveCheckoutOptionsForOrgs(vendorOrgIds, branchesByOrg);
    const fulfillmentOption = resolvedOptions.fulfillment.find((o) => o.id === fulfillment);
    const paymentOption = resolvedOptions.payment.find((o) => o.id === payment);

    if (!fulfillmentOption) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return {
        success: false,
        error: "Selected fulfillment method is not available for this cart.",
      };
    }
    if (!paymentOption) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return {
        success: false,
        error: "Selected payment method is not available for this cart.",
      };
    }

    // 6. Payment method validation
    const bankDetailsByOrg = isBankTransferPayment(payment)
      ? await getBankTransferDetailsForOrgs(vendorOrgIds)
      : {};
    const paymentValidation = validatePayment({
      payment,
      paymentOption,
      fulfillmentOption,
      vendorOrgIds,
      bankDetailsByOrg,
      uniqueItemIds,
    });
    if (!paymentValidation.success) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return { success: false, error: paymentValidation.error! };
    }

    // 7. Fulfillment method validation
    const fulfillmentValidation = validateFulfillment({
      fulfillmentOption,
      pickupBranch: pickupBranch ?? null,
      vendorOrgIds,
      branchRows,
      branchesByOrg,
      uniqueItemIds,
    });
    if (!fulfillmentValidation.success) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return { success: false, error: fulfillmentValidation.error! };
    }

    // 8. Address normalization and validation
    const normalizedShippingAddress = shippingAddressInput?.trim() || null;
    const normalizedShippingAddressLine2 = shippingAddressLine2Input?.trim() || null;
    const normalizedShippingCity = shippingCityInput?.trim() || null;
    const normalizedShippingState = shippingStateInput?.trim() || null;
    const normalizedShippingPostalCode = shippingPostalCodeInput?.trim() || null;
    const normalizedShippingCountry = shippingCountryInput?.trim() || null;
    const normalizedShippingPhone = shippingPhoneInput?.trim() || null;
    const normalizedShippingPhone2 = shippingPhone2Input?.trim() || null;

    const addressValidation = validateShippingAddress({
      fulfillmentOption,
      normalizedShippingAddress,
      normalizedShippingCity,
      normalizedShippingState,
      normalizedShippingPostalCode,
      normalizedShippingCountry,
      normalizedShippingPhone,
    });
    if (!addressValidation.success) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return { success: false, error: addressValidation.error! };
    }

    // 9. Tax breakdown calculation
    const taxBreakdown = await buildCartTaxBreakdown(
      verifiedItems.map((i) => ({
        productId: i.id,
        unitPriceCents: i.price,
        quantity: i.quantity,
        vendorOrgId: i.vendorOrgId,
      })),
      vendorOrgIds[0] || "",
    );

    // 10. Shipping rate calculation & boundary validation
    const shippingResult = await calculateAndValidateCheckoutShipping({
      zeroShipping: fulfillmentOption.zeroShipping === true,
      verifiedItems,
      branchesByOrg,
      destination: {
        name,
        street: normalizedShippingAddress,
        city: normalizedShippingCity,
        state: normalizedShippingState,
        postalCode: normalizedShippingPostalCode,
        country: normalizedShippingCountry,
      },
      clientGrandTotal,
      serverSubtotal,
      totalTaxCents: taxBreakdown.totalTaxCents,
    });

    if (!shippingResult.success) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return { success: false, error: shippingResult.error };
    }

    const { clientShippingCents } = shippingResult;

    // 11. Totals verification
    const checkoutTotals = calculateCheckoutTotals(
      serverSubtotal,
      fulfillmentOption.zeroShipping === true,
      taxBreakdown.totalTaxCents,
      fulfillmentOption.zeroShipping ? null : clientShippingCents || null,
    );

    if (clientGrandTotal !== checkoutTotals.grandTotal) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return {
        success: false,
        error: `Checkout total mismatch. Expected ${checkoutTotals.grandTotal}, received ${clientGrandTotal}. Please refresh your cart and try again.`,
      };
    }

    // 12. Branch resolution for inventory deduction
    const orgBranchesLength = branchesByOrg.get(vendorOrgIds[0])?.length || 0;
    const isVirtualOrSingleBranchOrg = vendorOrgIds.length === 1 && orgBranchesLength <= 1;
    const pickupBranchForStock =
      fulfillmentOption.requiresBranch && !isVirtualOrSingleBranchOrg ? pickupBranch : null;

    // 13. Transaction execution with retries
    const orderStatus = resolveInitialOrderStatus(paymentOption);
    const txResult = await executeCheckoutWithRetry({
      verifiedItems,
      availabilityCatalog,
      pickupBranchForStock: pickupBranchForStock ?? null,
      orderStatus,
      name,
      email,
      userId: ctx.userId,
      checkoutTotals,
      taxBreakdown,
      fulfillment,
      payment,
      fulfillmentOption,
      pickupBranch: pickupBranch ?? null,
      normalizedShippingAddress,
      normalizedShippingAddressLine2,
      normalizedShippingCity,
      normalizedShippingState,
      normalizedShippingPostalCode,
      normalizedShippingCountry,
      normalizedShippingPhone,
      normalizedShippingPhone2,
      serverSubtotal,
      uniqueItemIds,
      presentmentCurrency: input.presentmentCurrency || DEFAULT_CURRENCY,
      vendorBaseCurrency: verifiedItems[0]?.vendorBaseCurrency || DEFAULT_CURRENCY,
      idempotencyKey: null, // outer pipeline already manages idempotency locking and completion
    });

    if (!txResult.success) {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
      return { success: false, error: txResult.error };
    }

    // 14. Post-checkout success processing (shipment, email confirmation, vendor notifications)
    const finalResult = await processCheckoutSuccess({
      orderId: txResult.orderId,
      grandTotalCents: txResult.grandTotalCents,
      currency: input.presentmentCurrency || DEFAULT_CURRENCY,
      vendorSubtotals: txResult.vendorSubtotals,
      serverSubtotalCents: txResult.serverSubtotalCents,
      payment,
      fulfillment,
      name,
      email,
      userId: ctx.userId,
      selectedRateId: input.selectedRateId,
      vendorOrgId: vendorOrgIds[0],
      shippingAddress: normalizedShippingAddress
        ? {
            street: normalizedShippingAddress,
            city: normalizedShippingCity || "",
            state: normalizedShippingState || "",
            postalCode: normalizedShippingPostalCode || "",
            country: normalizedShippingCountry || "LK",
            phone: normalizedShippingPhone || undefined,
          }
        : null,
      items: verifiedItems.map((i) => ({ id: i.id, quantity: i.quantity })),
    });

    if (finalResult.success) {
      await completeIdempotency(effectiveIdempotencyKey, finalResult, 86400);
    } else {
      await releaseIdempotencyLock(effectiveIdempotencyKey);
    }

    return finalResult;
  } catch (error) {
    await releaseIdempotencyLock(effectiveIdempotencyKey);
    throw error;
  }
}
