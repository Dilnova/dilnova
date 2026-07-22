"use server";

import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { uploadPaymentSlipFormSchema } from "@/features/orders/schema";
import { rateLimit } from "@/shared/security/rate-limit";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { getNormalizedClerkUserEmail } from "@/features/customer/email";
import { canUploadPaymentSlip } from "@/features/orders/payment.rules";
import { customerOwnsOrder } from "@/features/orders/customer-ownership";
import { logAuditAction } from "@/shared/audit/logger";
import { sendPaymentSlipUploadedNotifications } from "@/features/orders/email/payment-slip";
import { logger } from "@/shared/logging/logger";
import { isSupabaseStorageConfigured } from "@/shared/storage/admin-client";
import {
  createPaymentSlipSignedUrl,
  resolvePaymentSlipExtension,
  resolvePaymentSlipExtensionFromFilename,
  createPaymentSlipSignedUploadUrl,
  verifyPaymentSlipFileExists,
  verifyPaymentSlipMagicBytes,
  isPaymentSlipStoragePath,
} from "@/shared/storage/payment-slip";
import { PAYMENT_SLIP_MAX_BYTES } from "@/shared/storage/config";
import { authenticatedAction, ActionError } from "@/lib/safe-action";
import { z } from "zod/v3";

// ── Internal helper ───────────────────────────────────────────────────────────
// userId is passed in from the action ctx — no auth() call needed here.

async function validateCustomerAndOrder(
  orderId: string,
  userId: string,
): Promise<
  | { success: false; error: string }
  | {
      success: true;
      userId: string;
      order: typeof schema.simulatedOrders.$inferSelect;
      sessionEmail: string;
    }
> {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Authentication session is invalid. Please sign in again." };
  }

  const sessionEmail = getNormalizedClerkUserEmail(user);
  if (!sessionEmail) {
    return {
      success: false,
      error: "Your account does not have an email address. Please update your profile first.",
    };
  }

  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  if (!customerOwnsOrder(order, userId)) {
    return { success: false, error: "You are not authorized to update this order." };
  }

  if (!canUploadPaymentSlip(order)) {
    return {
      success: false,
      error: "This order is not accepting a payment slip upload.",
    };
  }

  return { success: true, userId, order, sessionEmail };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const createPaymentSlipUploadPresignedUrlAction = authenticatedAction
  .schema(
    z.object({
      orderId: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      fileType: z.string(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      if (!isSupabaseStorageConfigured()) {
        return {
          success: false as const,
          error: "Payment slip storage is not configured. Contact support.",
        };
      }

      const orderIdParsed = uploadPaymentSlipFormSchema.safeParse({
        orderId: parsedInput.orderId,
      });
      if (!orderIdParsed.success) {
        return {
          success: false as const,
          error: orderIdParsed.error.issues[0]?.message || "Invalid order ID.",
        };
      }

      if (parsedInput.fileSize === 0) {
        return { success: false as const, error: "The selected file is empty." };
      }

      if (parsedInput.fileSize > PAYMENT_SLIP_MAX_BYTES) {
        return { success: false as const, error: "Image must be 8 MB or smaller." };
      }

      const contentType =
        resolvePaymentSlipExtension(parsedInput.fileType) ??
        resolvePaymentSlipExtensionFromFilename(parsedInput.fileName);
      if (!contentType) {
        return {
          success: false as const,
          error: "Please upload an image file (JPG, PNG, WebP, or GIF).",
        };
      }

      const validation = await validateCustomerAndOrder(orderIdParsed.data.orderId, ctx.userId);
      if (!validation.success) {
        return { success: false as const, error: validation.error };
      }
      const { order } = validation;

      try {
        const { signedUrl, storagePath } = await createPaymentSlipSignedUploadUrl({
          orderId: order.id,
          contentType,
        });

        return {
          success: true as const,
          signedUrl,
          storagePath,
        };
      } catch (error) {
        logger.error("Failed to generate pre-signed upload URL", { orderId: order.id, error });
        return {
          success: false as const,
          error: "Failed to initialize payment slip upload. Please try again.",
        };
      }
    });
  });

export const submitPaymentSlipPathAction = authenticatedAction
  .schema(
    z.object({
      orderId: z.string(),
      storagePath: z.string(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      if (!isSupabaseStorageConfigured()) {
        return {
          success: false as const,
          error: "Payment slip storage is not configured. Contact support.",
        };
      }

      const orderIdParsed = uploadPaymentSlipFormSchema.safeParse({
        orderId: parsedInput.orderId,
      });
      if (!orderIdParsed.success) {
        return {
          success: false as const,
          error: orderIdParsed.error.issues[0]?.message || "Invalid order ID.",
        };
      }

      if (!parsedInput.storagePath.startsWith(`orders/${orderIdParsed.data.orderId}/`)) {
        return {
          success: false as const,
          error: "Invalid storage path.",
        };
      }

      if (!isPaymentSlipStoragePath(parsedInput.storagePath)) {
        return {
          success: false as const,
          error: "Invalid storage path format.",
        };
      }

      const validation = await validateCustomerAndOrder(orderIdParsed.data.orderId, ctx.userId);
      if (!validation.success) {
        return { success: false as const, error: validation.error };
      }
      const { userId, order } = validation;

      const exists = await verifyPaymentSlipFileExists(parsedInput.storagePath);
      if (!exists) {
        return {
          success: false as const,
          error:
            "Uploaded payment slip could not be verified in storage. Please try uploading again.",
        };
      }

      const hasValidMagicBytes = await verifyPaymentSlipMagicBytes(parsedInput.storagePath);
      if (!hasValidMagicBytes) {
        return {
          success: false as const,
          error: "Uploaded file appears to be corrupted or is not a valid image format.",
        };
      }

      await db
        .update(schema.simulatedOrders)
        .set({
          paymentSlipUrl: parsedInput.storagePath,
          paymentSlipUploadedAt: new Date(),
          status: "payment_submitted",
          updatedAt: new Date(),
        })
        .where(eq(schema.simulatedOrders.id, order.id));

      await logAuditAction({
        userId,
        action: "SUBMIT_PAYMENT_SLIP",
        targetType: "simulated_order",
        targetId: order.id,
        metadata: { paymentMethod: order.paymentMethod, storage: "supabase" },
      });

      revalidatePath("/cart");
      revalidatePath("/customer");
      revalidatePath(`/customer/invoice/${order.id}`);
      revalidatePath("/vendor");
      revalidatePath("/superadmin");

      void sendPaymentSlipUploadedNotifications(order.id).then((emailResult) => {
        if (!emailResult.success) {
          logger.warn("Payment slip saved but vendor notification email was not sent", {
            orderId: order.id,
            error: emailResult.error,
            notifiedCount: emailResult.notifiedCount,
          });
        }
      });

      const previewUrl = await createPaymentSlipSignedUrl(parsedInput.storagePath);

      return {
        success: true as const,
        previewUrl,
        vendorNotified: false,
      };
    });
  });
