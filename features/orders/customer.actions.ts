'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { uploadPaymentSlipFormSchema } from '@/features/orders/schema';
import { rateLimit } from '@/shared/security/rate-limit';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { getNormalizedClerkUserEmail } from '@/features/customer/email';
import { canUploadPaymentSlip } from '@/features/orders/payment.rules';
import { customerOwnsOrder } from '@/features/orders/customer-ownership';
import { logAuditAction } from '@/shared/audit/logger';
import { sendPaymentSlipUploadedNotifications } from '@/features/orders/email/payment-slip';
import { logger } from '@/shared/logging/logger';
import { isSupabaseStorageConfigured } from '@/shared/storage/admin-client';
import {
  createPaymentSlipSignedUrl,
  resolvePaymentSlipExtension,
  resolvePaymentSlipExtensionFromFilename,
  createPaymentSlipSignedUploadUrl,
  verifyPaymentSlipFileExists,
  isPaymentSlipStoragePath,
  uploadPaymentSlipToStorage,
} from '@/shared/storage/payment-slip';
import { PAYMENT_SLIP_MAX_BYTES, type PaymentSlipMimeType } from '@/shared/storage/config';

export async function createPaymentSlipUploadPresignedUrlAction(input: {
  orderId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(10, 60 * 1000);

    if (!isSupabaseStorageConfigured()) {
      return {
        success: false as const,
        error: 'Payment slip storage is not configured. Contact support.',
      };
    }

    const parsed = uploadPaymentSlipFormSchema.safeParse({
      orderId: input.orderId,
    });
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message || 'Invalid order ID.',
      };
    }

    if (input.fileSize === 0) {
      return { success: false as const, error: 'The selected file is empty.' };
    }

    if (input.fileSize > PAYMENT_SLIP_MAX_BYTES) {
      return { success: false as const, error: 'Image must be 8 MB or smaller.' };
    }

    const contentType =
      resolvePaymentSlipExtension(input.fileType) ??
      resolvePaymentSlipExtensionFromFilename(input.fileName);
    if (!contentType) {
      return {
        success: false as const,
        error: 'Please upload an image file (JPG, PNG, WebP, or GIF).',
      };
    }

    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Please sign in to upload a payment slip.' };
    }

    const user = await currentUser();
    if (!user) {
      return { success: false as const, error: 'Authentication session is invalid. Please sign in again.' };
    }

    const sessionEmail = getNormalizedClerkUserEmail(user);
    if (!sessionEmail) {
      return {
        success: false as const,
        error: 'Your account does not have an email address. Please update your profile first.',
      };
    }

    const [order] = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, parsed.data.orderId))
      .limit(1);

    if (!order) {
      return { success: false as const, error: 'Order not found.' };
    }

    if (!customerOwnsOrder(order, userId)) {
      return { success: false as const, error: 'You are not authorized to update this order.' };
    }

    if (!canUploadPaymentSlip(order)) {
      return {
        success: false as const,
        error: 'This order is not accepting a payment slip upload.',
      };
    }

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
      logger.error('Failed to generate pre-signed upload URL', { orderId: order.id, error });
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Failed to initialize payment slip upload.',
      };
    }
  });
}

export async function submitPaymentSlipPathAction(input: {
  orderId: string;
  storagePath: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(10, 60 * 1000);

    if (!isSupabaseStorageConfigured()) {
      return {
        success: false as const,
        error: 'Payment slip storage is not configured. Contact support.',
      };
    }

    const parsed = uploadPaymentSlipFormSchema.safeParse({
      orderId: input.orderId,
    });
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message || 'Invalid order ID.',
      };
    }

    if (!input.storagePath.startsWith(`orders/${parsed.data.orderId}/`)) {
      return {
        success: false as const,
        error: 'Invalid storage path.',
      };
    }

    if (!isPaymentSlipStoragePath(input.storagePath)) {
      return {
        success: false as const,
        error: 'Invalid storage path format.',
      };
    }

    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Please sign in to upload a payment slip.' };
    }

    const user = await currentUser();
    if (!user) {
      return { success: false as const, error: 'Authentication session is invalid. Please sign in again.' };
    }

    const sessionEmail = getNormalizedClerkUserEmail(user);
    if (!sessionEmail) {
      return {
        success: false as const,
        error: 'Your account does not have an email address. Please update your profile first.',
      };
    }

    const [order] = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, parsed.data.orderId))
      .limit(1);

    if (!order) {
      return { success: false as const, error: 'Order not found.' };
    }

    if (!customerOwnsOrder(order, userId)) {
      return { success: false as const, error: 'You are not authorized to update this order.' };
    }

    if (!canUploadPaymentSlip(order)) {
      return {
        success: false as const,
        error: 'This order is not accepting a payment slip upload.',
      };
    }

    const exists = await verifyPaymentSlipFileExists(input.storagePath);
    if (!exists) {
      return {
        success: false as const,
        error: 'Uploaded payment slip could not be verified in storage. Please try uploading again.',
      };
    }

    await db
      .update(schema.simulatedOrders)
      .set({
        paymentSlipUrl: input.storagePath,
        paymentSlipUploadedAt: new Date(),
        status: 'payment_submitted',
        updatedAt: new Date(),
      })
      .where(eq(schema.simulatedOrders.id, order.id));

    await logAuditAction({
      userId,
      action: 'SUBMIT_PAYMENT_SLIP',
      targetType: 'simulated_order',
      targetId: order.id,
      metadata: { paymentMethod: order.paymentMethod, storage: 'supabase' },
    });

    revalidatePath('/cart');
    revalidatePath('/customer');
    revalidatePath(`/customer/invoice/${order.id}`);
    revalidatePath('/vendor');
    revalidatePath('/superadmin');

    void sendPaymentSlipUploadedNotifications(order.id).then((emailResult) => {
      if (!emailResult.success) {
        logger.warn('Payment slip saved but vendor notification email was not sent', {
          orderId: order.id,
          error: emailResult.error,
          notifiedCount: emailResult.notifiedCount,
        });
      }
    });

    const previewUrl = await createPaymentSlipSignedUrl(input.storagePath);

    return {
      success: true as const,
      previewUrl,
      vendorNotified: false,
    };
  });
}


