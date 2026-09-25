"use server";

import { currentUser } from "@clerk/nextjs/server";
import { rateLimit } from "@/shared/security/rate-limit";
import { handleApiError } from "@/shared/errors/error-handler";
import { getNormalizedClerkUserEmail } from "@/features/customer/email";
import { logger } from "@/shared/logging/logger";
import { checkoutSchema, sendCartEmailSchema } from "@/features/cart/schema";
import { DEFAULT_CURRENCY } from "@/shared/currency";
import { z } from "zod/v3";
import { authenticatedAction } from "@/lib/safe-action";

// Services
import { getCustomerDeliveryDetailsService } from "./services/customer-delivery.service";
import { sendCartSummaryEmailService } from "./services/cart-email.service";
import { getCheckoutOptionsService } from "./services/checkout-options.service";
import { syncCartPricesService } from "./services/cart-sync.service";
import { executeSimulatedCheckout } from "./services/checkout-pipeline.service";

const syncCartSchema = z.array(z.string().uuid()).max(50);

export const getCustomerDeliveryDetailsAction = authenticatedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    return await getCustomerDeliveryDetailsService(ctx.userId);
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
      currency: z.string().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    try {
      const parsedCartInput = sendCartEmailSchema.safeParse({
        emailAddress: parsedInput.emailAddress,
        cartItems: parsedInput.cartItems,
        cartTotal: parsedInput.cartTotal,
        currency: parsedInput.currency,
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

      await rateLimit(3, 60 * 1000, ctx.userId, { failClosed: true });

      return await sendCartSummaryEmailService(
        validatedItems,
        validatedEmail,
        parsedInput.zeroShipping,
        parsedInput.currency || DEFAULT_CURRENCY,
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
  .action(async ({ parsedInput, ctx }) => {
    try {
      await rateLimit(15, 60 * 1000, ctx.userId, { failClosed: true });

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
      return await executeSimulatedCheckout(parsedInput, ctx);
    } catch (error: unknown) {
      const apiError = handleApiError(error, "Checkout failed");
      return { success: false, error: apiError.message };
    }
  });
