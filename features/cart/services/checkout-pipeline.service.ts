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
 * 2. Rate limiting (fail-closed)
 * 3. Cart integrity, catalog availability, and single-vendor constraints
 * 4. Multi-org branch and checkout option resolution
 * 5. Payment, fulfillment, and shipping address validation
 * 6. Dynamic tax breakdown computation
 * 7. Multi-vendor carrier rate calculation and boundary validation
 * 8. Grand total verification against client-submitted amounts
 * 9. Idempotent DB transaction with exponential backoff retries
 * 10. Post-order carrier label, confirmation email, and vendor notification dispatch
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

  // 2. Rate limiting
  await rateLimit(5, 60 * 1000, ctx.userId, { failClosed: true });

  // 3. Cart item verification
  const validationResult = await validateAndPrepareCartItems(
    aggregatedItems,
    checkoutVendorOrgIdInput || null,
  );

  if (!validationResult.success) {
    return { success: false, error: validationResult.error! };
  }

  const { verifiedItems, serverSubtotal, vendorOrgIds, uniqueItemIds, availabilityCatalog } =
    validationResult;

  // 4. Branch and checkout options resolution
  const { branchRows, branchesByOrg } = await fetchBranchesForOrgs(vendorOrgIds);
  const resolvedOptions = await resolveCheckoutOptionsForOrgs(vendorOrgIds, branchesByOrg);
  const fulfillmentOption = resolvedOptions.fulfillment.find((o) => o.id === fulfillment);
  const paymentOption = resolvedOptions.payment.find((o) => o.id === payment);

  if (!fulfillmentOption) {
    return {
      success: false,
      error: "Selected fulfillment method is not available for this cart.",
    };
  }
  if (!paymentOption) {
    return {
      success: false,
      error: "Selected payment method is not available for this cart.",
    };
  }

  // 5. Payment method validation
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
    return { success: false, error: paymentValidation.error! };
  }

  // 6. Fulfillment validation
  const fulfillmentValidation = validateFulfillment({
    fulfillmentOption,
    pickupBranch: pickupBranch ?? null,
    vendorOrgIds,
    branchRows,
    branchesByOrg,
    uniqueItemIds,
  });
  if (!fulfillmentValidation.success) {
    return { success: false, error: fulfillmentValidation.error! };
  }

  // 7. Address normalization and validation
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
    return { success: false, error: addressValidation.error! };
  }

  // 8. Tax breakdown calculation
  const taxBreakdown = await buildCartTaxBreakdown(
    verifiedItems.map((i) => ({
      productId: i.id,
      unitPriceCents: i.price,
      quantity: i.quantity,
      vendorOrgId: i.vendorOrgId,
    })),
    vendorOrgIds[0] || "",
  );

  // 9. Shipping rate calculation & boundary validation
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
    return { success: false, error: shippingResult.error };
  }

  const { clientShippingCents } = shippingResult;

  // 10. Totals verification
  const checkoutTotals = calculateCheckoutTotals(
    serverSubtotal,
    fulfillmentOption.zeroShipping === true,
    taxBreakdown.totalTaxCents,
    fulfillmentOption.zeroShipping ? null : clientShippingCents || null,
  );

  if (clientGrandTotal !== checkoutTotals.grandTotal) {
    return {
      success: false,
      error: `Checkout total mismatch. Expected ${checkoutTotals.grandTotal}, received ${clientGrandTotal}. Please refresh your cart and try again.`,
    };
  }

  // 11. Branch resolution for inventory deduction
  const orgBranchesLength = branchesByOrg.get(vendorOrgIds[0])?.length || 0;
  const isVirtualOrSingleBranchOrg = vendorOrgIds.length === 1 && orgBranchesLength <= 1;
  const pickupBranchForStock =
    fulfillmentOption.requiresBranch && !isVirtualOrSingleBranchOrg ? pickupBranch : null;

  // 12. Transaction execution with retries and idempotency
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
    idempotencyKey,
  });

  if (!txResult.success) {
    return { success: false, error: txResult.error };
  }

  // 13. Post-checkout success processing (shipment, email confirmation, vendor notifications)
  return await processCheckoutSuccess({
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
}
