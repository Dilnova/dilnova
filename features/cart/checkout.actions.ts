'use server';

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { rateLimit } from '@/shared/security/rate-limit';
import { handleApiError } from '@/shared/errors/error-handler';
import { getNormalizedClerkUserEmail } from '@/features/customer/email';
import { resolveInitialOrderStatus, isPaymentCompatibleWithFulfillment } from '@/features/organization/checkout-options.shared';
import { resolveCheckoutOptionsForOrgs } from '@/features/organization/checkout-options';
import { calculateCheckoutTotals } from '@/features/billing/checkout-totals';
import { isBankTransferPayment } from '@/features/billing/bank-transfer';
import { getBankTransferDetailsForOrgs } from '@/features/billing/bank-transfer.server';
import { logger } from '@/shared/logging/logger';
import {
  checkoutSchema,
  sendCartEmailSchema,
  type CartLineInput,
  type CheckoutItemInput,
} from '@/features/cart/schema';
import { aggregateCheckoutItems, type CheckoutTransactionResult } from '@/features/cart/checkout.helpers';
import { z } from 'zod';
import { validateFulfillment, validateShippingAddress } from './services/fulfillment.service';
import { validatePayment } from './services/payment.service';
import { executeCheckoutTransaction } from './services/checkout-transaction.service';
import { validateAndPrepareCartItems, processCheckoutSuccess } from './services/checkout-validation.service';

// Services
import { sendCartSummaryEmailService } from './services/cart-email.service';
import { getCheckoutOptionsService, fetchBranchesForOrgs } from './services/checkout-options.service';
import { syncCartPricesService } from './services/cart-sync.service';

const syncCartSchema = z.array(z.string().uuid()).max(50);

export async function getCustomerDeliveryDetailsAction() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (user && user.privateMetadata) {
      return {
        shippingAddress: (user.privateMetadata.shippingAddress as string) || '',
        shippingAddressLine2: (user.privateMetadata.shippingAddressLine2 as string) || '',
        shippingCity: (user.privateMetadata.shippingCity as string) || '',
        shippingState: (user.privateMetadata.shippingState as string) || '',
        shippingPostalCode: (user.privateMetadata.shippingPostalCode as string) || '',
        shippingCountry: (user.privateMetadata.shippingCountry as string) || '',
        shippingPhone: (user.privateMetadata.shippingPhone as string) || '',
        shippingPhone2: (user.privateMetadata.shippingPhone2 as string) || '',
      };
    }
    return null;
  } catch (error: unknown) {
    const apiError = handleApiError(error, 'Failed to get customer delivery details from Clerk');
    logger.error(apiError.message, { error });
    return null;
  }
}

export async function sendCartSummaryEmailAction(
  emailAddress: string,
  cartItems: CartLineInput[],
  cartTotal: number,
  zeroShipping = false
) {
  try {
    const parsedInput = sendCartEmailSchema.safeParse({
      emailAddress,
      cartItems,
      cartTotal,
    });
    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.issues[0]?.message || 'Invalid input data.' };
    }

    const { cartItems: validatedItems } = parsedInput.data;

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Please sign in to email your cart summary.' };
    }

    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Authentication session is invalid. Please sign in again.' };
    }

    const validatedEmail = getNormalizedClerkUserEmail(user);
    if (!validatedEmail) {
      return {
        success: false,
        error: 'Your account does not have an email address. Please update your profile first.',
      };
    }

    await rateLimit(3, 60 * 1000);

    return await sendCartSummaryEmailService(validatedItems, validatedEmail, zeroShipping);
  } catch (error: unknown) {
    const apiError = handleApiError(error, 'Failed to send cart summary email');
    logger.error(apiError.message, { error });
    return { success: false, error: apiError.message };
  }
}

export async function syncCartPricesAction(productIds: string[]) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Unauthorized. Please sign in.' };
    }

    await rateLimit(3, 60 * 1000);

    const parsed = syncCartSchema.safeParse(productIds.filter(Boolean));
    if (!parsed.success) {
      return { success: false as const, error: 'Invalid product IDs provided.' };
    }

    const uniqueIds = [...new Set(parsed.data)];
    if (uniqueIds.length === 0) {
      return { success: true as const, items: [], removedIds: [] };
    }

    return await syncCartPricesService(uniqueIds);
  } catch (error: unknown) {
    const apiError = handleApiError(error, 'Failed to sync cart prices');
    logger.error(apiError.message, { error });
    return { success: false as const, error: 'Failed to refresh cart prices.' };
  }
}

export async function getCartCheckoutOptionsAction(
  cartLines: { id: string; quantity: number; price: number }[],
  checkoutVendorOrgId?: string | null
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Please sign in to load checkout options.' };
    }

    return await getCheckoutOptionsService(cartLines, checkoutVendorOrgId);
  } catch (error: unknown) {
    const apiError = handleApiError(error, 'Failed to load checkout options');
    logger.error(apiError.message, { error });
    return { success: false as const, error: 'Failed to load checkout options.' };
  }
}

export async function simulatedCheckoutAction(
  customerName: string,
  customerEmail: string,
  items: CheckoutItemInput[],
  totalAmount: number,
  fulfillmentMethod: string,
  paymentMethod: string,
  pickupBranchId?: string | null,
  shippingAddress?: string | null,
  shippingPhone?: string | null,
  checkoutVendorOrgId?: string | null,
  shippingAddressLine2?: string | null,
  shippingCity?: string | null,
  shippingState?: string | null,
  shippingPostalCode?: string | null,
  shippingCountry?: string | null,
  shippingPhone2?: string | null,
  idempotencyKey?: string | null
) {
  try {
    const parsed = checkoutSchema.safeParse({
      customerName,
      customerEmail,
      items,
      totalAmount,
      fulfillmentMethod,
      paymentMethod,
      pickupBranchId: pickupBranchId || null,
      shippingAddress: shippingAddress?.trim() || null,
      shippingAddressLine2: shippingAddressLine2?.trim() || null,
      shippingCity: shippingCity?.trim() || null,
      shippingState: shippingState?.trim() || null,
      shippingPostalCode: shippingPostalCode?.trim() || null,
      shippingCountry: shippingCountry?.trim() || null,
      shippingPhone: shippingPhone?.trim() || null,
      shippingPhone2: shippingPhone2?.trim() || null,
      checkoutVendorOrgId: checkoutVendorOrgId || null,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid checkout data.' };
    }

    let name = parsed.data.customerName.trim();
    let email = customerEmail; // Will be overridden by session email if available
    const aggregatedItems = aggregateCheckoutItems(parsed.data.items);
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
    } = parsed.data;

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Please sign in to place an order.' };
    }

    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Authentication session is invalid. Please sign in again.' };
    }

    const sessionEmail = getNormalizedClerkUserEmail(user);
    if (!sessionEmail) {
      return {
        success: false,
        error: 'Your account does not have an email address. Please update your profile before checkout.',
      };
    }
    email = sessionEmail;
    name = user.fullName || user.firstName || name;

    await rateLimit(5, 60 * 1000);

    if (idempotencyKey) {
      const { checkIdempotencyKey } = await import('@/shared/security/idempotency');
      const isNewRequest = await checkIdempotencyKey(idempotencyKey);
      if (!isNewRequest) {
        return { success: false, error: 'This order is already being processed. Please wait or refresh the page.' };
      }
    }

    const validationResult = await validateAndPrepareCartItems(
      aggregatedItems,
      checkoutVendorOrgIdInput || null
    );

    if (!validationResult.success) {
      return { success: false as const, error: validationResult.error! };
    }

    const {
      verifiedItems,
      serverSubtotal,
      vendorOrgIds,
      uniqueItemIds,
      availabilityCatalog
    } = validationResult;

    const { branchRows, branchesByOrg } = await fetchBranchesForOrgs(vendorOrgIds);

    const resolvedOptions = await resolveCheckoutOptionsForOrgs(vendorOrgIds, branchesByOrg);
    const fulfillmentOption = resolvedOptions.fulfillment.find((o) => o.id === fulfillment);
    const paymentOption = resolvedOptions.payment.find((o) => o.id === payment);

    if (!fulfillmentOption) {
      return { success: false, error: 'Selected fulfillment method is not available for this cart.' };
    }
    if (!paymentOption) {
      return { success: false, error: 'Selected payment method is not available for this cart.' };
    }

    const bankDetailsByOrg = isBankTransferPayment(payment) ? await getBankTransferDetailsForOrgs(vendorOrgIds) : {};
    const paymentValidation = validatePayment({
      payment,
      paymentOption,
      fulfillmentOption,
      vendorOrgIds,
      bankDetailsByOrg,
      uniqueItemIds
    });
    if (!paymentValidation.success) {
      return { success: false as const, error: paymentValidation.error! };
    }

    const fulfillmentValidation = validateFulfillment({
      fulfillmentOption,
      pickupBranch: pickupBranch ?? null,
      vendorOrgIds,
      branchRows,
      branchesByOrg,
      uniqueItemIds
    });
    if (!fulfillmentValidation.success) {
      return { success: false as const, error: fulfillmentValidation.error! };
    }

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
      normalizedShippingPhone
    });
    if (!addressValidation.success) {
      return { success: false as const, error: addressValidation.error! };
    }

    const checkoutTotals = calculateCheckoutTotals(
      serverSubtotal,
      fulfillmentOption.zeroShipping === true
    );
    if (checkoutTotals.grandTotal !== clientGrandTotal) {
      return {
        success: false,
        error: `Checkout total mismatch. Expected ${checkoutTotals.grandTotal}, received ${clientGrandTotal}. Please refresh your cart and try again.`,
      };
    }

    const orgBranchesLength = branchesByOrg.get(vendorOrgIds[0])?.length || 0;
    const isVirtualOrSingleBranchOrg = vendorOrgIds.length === 1 && orgBranchesLength <= 1;
    const pickupBranchForStock = fulfillmentOption.requiresBranch && !isVirtualOrSingleBranchOrg ? pickupBranch : null;

    verifiedItems.sort((a, b) => a.id.localeCompare(b.id));

    const MAX_RETRIES = 3;
    let txResult: CheckoutTransactionResult | null = null;
    let txError: unknown = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const orderStatus = resolveInitialOrderStatus(paymentOption);
        txResult = await executeCheckoutTransaction({
          verifiedItems,
          availabilityCatalog,
          pickupBranchForStock: pickupBranchForStock ?? null,
          orderStatus,
          name,
          email,
          userId,
          checkoutTotals,
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
          uniqueItemIds
        }) as CheckoutTransactionResult;
        break; 
      } catch (error) {
        txError = error;
        logger.warn(`Checkout DB transaction failed (attempt ${attempt}/${MAX_RETRIES})`, {
          error: error instanceof Error ? error.message : String(error),
        });
        if (attempt === MAX_RETRIES) {
          break; 
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 200 + Math.random() * 100));
      }
    }

    if (!txResult) {
      logger.error('Checkout DB transaction failed permanently', { error: txError });
      return { success: false, error: 'A database error occurred while processing your order. Please try again.' };
    }

    if (!txResult.success) {
      return { success: false, error: txResult.error };
    }

    const successResult = await processCheckoutSuccess({
      orderId: txResult.orderId,
      grandTotalCents: txResult.grandTotalCents,
      vendorSubtotals: txResult.vendorSubtotals,
      serverSubtotalCents: txResult.serverSubtotalCents,
      payment,
      fulfillment,
      name,
      email,
      userId: userId || null,
    });

    return successResult;
  } catch (error: unknown) {
    const apiError = handleApiError(error, 'Checkout failed');
    return { success: false, error: apiError.message };
  }
}
