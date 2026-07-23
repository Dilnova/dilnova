"use server";

import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { rateLimit } from "@/shared/security/rate-limit";
import { handleApiError } from "@/shared/errors/error-handler";
import { getNormalizedClerkUserEmail } from "@/features/customer/email";
import { resolveInitialOrderStatus } from "@/features/organization/checkout-options.shared";
import { resolveCheckoutOptionsForOrgs } from "@/features/organization/checkout-options";
import { calculateCheckoutTotals } from "@/features/billing/checkout-totals";
import { isBankTransferPayment } from "@/features/billing/bank-transfer";
import { getBankTransferDetailsForOrgs } from "@/features/billing/bank-transfer.server";
import { logger } from "@/shared/logging/logger";
import { checkoutSchema, sendCartEmailSchema } from "@/features/cart/schema";
import {
  aggregateCheckoutItems,
  type CheckoutTransactionResult,
} from "@/features/cart/checkout.helpers";
import { z } from "zod/v3";
import { validateFulfillment, validateShippingAddress } from "./services/fulfillment.service";
import { validatePayment } from "./services/payment.service";
import { executeCheckoutTransaction } from "./services/checkout-transaction.service";
import {
  validateAndPrepareCartItems,
  processCheckoutSuccess,
} from "./services/checkout-validation.service";

// Services
import { sendCartSummaryEmailService } from "./services/cart-email.service";
import {
  getCheckoutOptionsService,
  fetchBranchesForOrgs,
} from "./services/checkout-options.service";
import { syncCartPricesService } from "./services/cart-sync.service";

import { authenticatedAction } from "@/lib/safe-action";

const syncCartSchema = z.array(z.string().uuid()).max(50);

export const getCustomerDeliveryDetailsAction = authenticatedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(ctx.userId);

      if (user && user.privateMetadata) {
        return {
          shippingAddress: (user.privateMetadata.shippingAddress as string) || "",
          shippingAddressLine2: (user.privateMetadata.shippingAddressLine2 as string) || "",
          shippingCity: (user.privateMetadata.shippingCity as string) || "",
          shippingState: (user.privateMetadata.shippingState as string) || "",
          shippingPostalCode: (user.privateMetadata.shippingPostalCode as string) || "",
          shippingCountry: (user.privateMetadata.shippingCountry as string) || "",
          shippingPhone: (user.privateMetadata.shippingPhone as string) || "",
          shippingPhone2: (user.privateMetadata.shippingPhone2 as string) || "",
        };
      }
      return null;
    } catch (error: unknown) {
      const apiError = handleApiError(error, "Failed to get customer delivery details from Clerk");
      logger.error(apiError.message, { error });
      return null;
    }
  });

export const sendCartSummaryEmailAction = authenticatedAction
  .schema(
    z.object({
      emailAddress: z.string().email(),
      cartItems: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
          imageUrl: z.string().nullable(),
          quantity: z.number().int().min(1),
          vendorName: z.string(),
          type: z.string(),
        }),
      ),
      cartTotal: z.number().nonnegative(),
      zeroShipping: z.boolean().optional().default(false),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const parsedCartInput = sendCartEmailSchema.safeParse({
        emailAddress: parsedInput.emailAddress,
        cartItems: parsedInput.cartItems,
        cartTotal: parsedInput.cartTotal,
      });
      if (!parsedCartInput.success) {
        return {
          success: false,
          error: parsedCartInput.error.issues[0]?.message || "Invalid input data.",
        };
      }

      const { cartItems: validatedItems } = parsedCartInput.data;

      const user = await currentUser();
      if (!user) {
        return {
          success: false,
          error: "Authentication session is invalid. Please sign in again.",
        };
      }

      const validatedEmail = getNormalizedClerkUserEmail(user);
      if (!validatedEmail) {
        return {
          success: false,
          error: "Your account does not have an email address. Please update your profile first.",
        };
      }

      await rateLimit(3, 60 * 1000, undefined, { failClosed: true });

      return await sendCartSummaryEmailService(
        validatedItems,
        validatedEmail,
        parsedInput.zeroShipping,
      );
    } catch (error: unknown) {
      const apiError = handleApiError(error, "Failed to send cart summary email");
      logger.error(apiError.message, { error });
      return { success: false, error: apiError.message };
    }
  });

export const syncCartPricesAction = authenticatedAction
  .schema(
    z.object({
      productIds: syncCartSchema,
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      await rateLimit(3, 60 * 1000, undefined, { failClosed: true });

      const uniqueIds = [...new Set(parsedInput.productIds)];
      if (uniqueIds.length === 0) {
        return { success: true as const, items: [], removedIds: [] };
      }

      return await syncCartPricesService(uniqueIds);
    } catch (error: unknown) {
      const apiError = handleApiError(error, "Failed to sync cart prices");
      logger.error(apiError.message, { error });
      return { success: false as const, error: "Failed to refresh cart prices." };
    }
  });

export const getCartCheckoutOptionsAction = authenticatedAction
  .schema(
    z.object({
      cartLines: z.array(
        z.object({
          id: z.string(),
          quantity: z.number(),
          price: z.number(),
        }),
      ),
      checkoutVendorOrgId: z.string().nullable().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      return await getCheckoutOptionsService(
        parsedInput.cartLines,
        parsedInput.checkoutVendorOrgId,
      );
    } catch (error: unknown) {
      const apiError = handleApiError(error, "Failed to load checkout options");
      logger.error(apiError.message, { error });
      return { success: false as const, error: "Failed to load checkout options." };
    }
  });

export const simulatedCheckoutAction = authenticatedAction
  .schema(
    checkoutSchema.extend({
      idempotencyKey: z.string().uuid().optional().nullable(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    try {
      let name = parsedInput.customerName.trim();
      const aggregatedItems = aggregateCheckoutItems(parsedInput.items);
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
      } = parsedInput;

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

      await rateLimit(5, 60 * 1000, ctx.userId, { failClosed: true });

      const validationResult = await validateAndPrepareCartItems(
        aggregatedItems,
        checkoutVendorOrgIdInput || null,
      );

      if (!validationResult.success) {
        return { success: false as const, error: validationResult.error! };
      }

      const { verifiedItems, serverSubtotal, vendorOrgIds, uniqueItemIds, availabilityCatalog } =
        validationResult;

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
        return { success: false, error: "Selected payment method is not available for this cart." };
      }

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
        return { success: false as const, error: paymentValidation.error! };
      }

      const fulfillmentValidation = validateFulfillment({
        fulfillmentOption,
        pickupBranch: pickupBranch ?? null,
        vendorOrgIds,
        branchRows,
        branchesByOrg,
        uniqueItemIds,
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
        normalizedShippingPhone,
      });
      if (!addressValidation.success) {
        return { success: false as const, error: addressValidation.error! };
      }

      const checkoutTotals = calculateCheckoutTotals(
        serverSubtotal,
        fulfillmentOption.zeroShipping === true,
      );
      if (checkoutTotals.grandTotal !== clientGrandTotal) {
        return {
          success: false,
          error: `Checkout total mismatch. Expected ${checkoutTotals.grandTotal}, received ${clientGrandTotal}. Please refresh your cart and try again.`,
        };
      }

      const orgBranchesLength = branchesByOrg.get(vendorOrgIds[0])?.length || 0;
      const isVirtualOrSingleBranchOrg = vendorOrgIds.length === 1 && orgBranchesLength <= 1;
      const pickupBranchForStock =
        fulfillmentOption.requiresBranch && !isVirtualOrSingleBranchOrg ? pickupBranch : null;

      verifiedItems.sort((a, b) => a.id.localeCompare(b.id));

      if (idempotencyKey) {
        const { checkIdempotencyKey } = await import("@/shared/security/idempotency");
        const isNewRequest = await checkIdempotencyKey(idempotencyKey);
        if (!isNewRequest) {
          return {
            success: false,
            error: "This order is already being processed. Please wait or refresh the page.",
          };
        }
      }

      const MAX_RETRIES = 3;
      let txResult: CheckoutTransactionResult | null = null;
      let txError: unknown = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const orderStatus = resolveInitialOrderStatus(paymentOption);
          txResult = (await executeCheckoutTransaction({
            verifiedItems,
            availabilityCatalog,
            pickupBranchForStock: pickupBranchForStock ?? null,
            orderStatus,
            name,
            email,
            userId: ctx.userId,
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
            uniqueItemIds,
          })) as CheckoutTransactionResult;
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
        logger.error("Checkout DB transaction failed permanently", { error: txError });
        return {
          success: false,
          error: "A database error occurred while processing your order. Please try again.",
        };
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
        userId: ctx.userId,
      });

      return successResult;
    } catch (error: unknown) {
      const apiError = handleApiError(error, "Checkout failed");
      return { success: false, error: apiError.message };
    }
  });
