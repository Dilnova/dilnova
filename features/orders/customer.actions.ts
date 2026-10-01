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
  deletePaymentSlipFromStorage,
  isPaymentSlipStoragePath,
} from "@/shared/storage/payment-slip";
import { PAYMENT_SLIP_MAX_BYTES, PAYMENT_SLIP_ALLOWED_MIME_TYPES } from "@/shared/storage/config";
import { uuidField } from "@/shared/validation/primitives";
import { authenticatedAction, ActionError } from "@/lib/safe-action";
import { z } from "zod/v3";

// ── Internal helper ───────────────────────────────────────────────────────────
// userId is passed in from the action ctx — no auth() call needed here.

async function validateCustomerAndOrder(
  orderId: string,
  userId: string,
): Promise<{
  userId: string;
  order: typeof schema.simulatedOrders.$inferSelect;
  sessionEmail: string;
}> {
  const user = await currentUser();
  if (!user) {
    throw new ActionError("Authentication session is invalid. Please sign in again.");
  }

  const sessionEmail = getNormalizedClerkUserEmail(user);
  if (!sessionEmail) {
    throw new ActionError(
      "Your account does not have an email address. Please update your profile first.",
    );
  }

  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    throw new ActionError("Order not found.");
  }

  if (!customerOwnsOrder(order, userId)) {
    throw new ActionError("You are not authorized to update this order.");
  }

  if (!canUploadPaymentSlip(order)) {
    throw new ActionError("This order is not accepting a payment slip upload.");
  }

  return { userId, order, sessionEmail };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const createPaymentSlipUploadPresignedUrlAction = authenticatedAction
  .schema(
    z.object({
      orderId: uuidField,
      fileName: z.string().max(255, "File name too long.").trim(),
      fileSize: z
        .number()
        .int()
        .min(1, "File cannot be empty.")
        .max(PAYMENT_SLIP_MAX_BYTES, "Image must be 8 MB or smaller."),
      fileType: z.enum(PAYMENT_SLIP_ALLOWED_MIME_TYPES, {
        message: "Please upload an image file (JPG, PNG, WebP, or GIF).",
      }),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      if (!isSupabaseStorageConfigured()) {
        throw new ActionError("Payment slip storage is not configured. Contact support.");
      }

      const orderIdParsed = uploadPaymentSlipFormSchema.safeParse({
        orderId: parsedInput.orderId,
      });
      if (!orderIdParsed.success) {
        throw new ActionError(orderIdParsed.error.issues[0]?.message || "Invalid order ID.");
      }

      if (parsedInput.fileSize === 0) {
        throw new ActionError("The selected file is empty.");
      }

      if (parsedInput.fileSize > PAYMENT_SLIP_MAX_BYTES) {
        throw new ActionError("Image must be 8 MB or smaller.");
      }

      const contentType =
        resolvePaymentSlipExtension(parsedInput.fileType) ??
        resolvePaymentSlipExtensionFromFilename(parsedInput.fileName);
      if (!contentType) {
        throw new ActionError("Please upload an image file (JPG, PNG, WebP, or GIF).");
      }

      const { order } = await validateCustomerAndOrder(orderIdParsed.data.orderId, ctx.userId);

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
        throw new ActionError("Failed to initialize payment slip upload. Please try again.");
      }
    });
  });

export const submitPaymentSlipPathAction = authenticatedAction
  .schema(
    z.object({
      orderId: uuidField,
      storagePath: z.string().max(500, "Storage path too long.").trim(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      if (!isSupabaseStorageConfigured()) {
        throw new ActionError("Payment slip storage is not configured. Contact support.");
      }

      const orderIdParsed = uploadPaymentSlipFormSchema.safeParse({
        orderId: parsedInput.orderId,
      });
      if (!orderIdParsed.success) {
        throw new ActionError(orderIdParsed.error.issues[0]?.message || "Invalid order ID.");
      }

      if (!parsedInput.storagePath.startsWith(`orders/${orderIdParsed.data.orderId}/`)) {
        throw new ActionError("Invalid storage path.");
      }

      if (!isPaymentSlipStoragePath(parsedInput.storagePath)) {
        throw new ActionError("Invalid storage path format.");
      }

      const { userId, order } = await validateCustomerAndOrder(
        orderIdParsed.data.orderId,
        ctx.userId,
      );

      const exists = await verifyPaymentSlipFileExists(parsedInput.storagePath);
      if (!exists) {
        throw new ActionError(
          "Uploaded payment slip could not be verified in storage. Please try uploading again.",
        );
      }

      const hasValidMagicBytes = await verifyPaymentSlipMagicBytes(parsedInput.storagePath);
      if (!hasValidMagicBytes) {
        try {
          await deletePaymentSlipFromStorage(parsedInput.storagePath);
        } catch (cleanupError) {
          logger.warn("Failed to delete corrupted payment slip from storage", {
            storagePath: parsedInput.storagePath,
            error: cleanupError,
          });
        }
        logger.warn("Security: Rejected payment slip upload due to invalid magic bytes", {
          orderId: order.id,
          userId,
          storagePath: parsedInput.storagePath,
        });
        throw new ActionError(
          "Uploaded file appears to be corrupted or is not a valid image format.",
        );
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
