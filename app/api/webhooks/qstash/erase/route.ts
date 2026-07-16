import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/shared/logging/logger';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Redis } from '@upstash/redis';
import { logAuditAction } from '@/shared/audit/logger';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';

export const maxDuration = 300;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

async function handler(req: NextRequest) {
  const messageId = req.headers.get('upstash-message-id');
  if (!messageId) {
    return NextResponse.json({ error: 'Missing upstash-message-id' }, { status: 400 });
  }

  try {
    // Check if already successfully processed
    const isDone = await redis.get(`erase:msg_id:${messageId}:done`);
    if (isDone) {
      logger.info(`Idempotency caught duplicate execution for QStash message ${messageId}`);
      return NextResponse.json({ success: true, message: 'Duplicate message ignored' }, { status: 200 });
    }

    // Acquire a short-lived processing lock to prevent concurrent identical deliveries
    const lock = await redis.set(`erase:msg_id:${messageId}:lock`, "1", { nx: true, ex: 120 });
    if (!lock) {
      logger.warn(`QStash message ${messageId} is currently being processed. Returning 409 to trigger retry.`);
      return NextResponse.json({ error: 'Currently processing' }, { status: 409 });
    }

    const body = await req.json();
    const { targetUserId, adminUserId } = body;

    if (!targetUserId || !adminUserId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const client = await clerkClient();
    let clerkProfileDeleted = false;
    let email = null;
    try {
      const clerkUser = await client.users.getUser(targetUserId);
      email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() || null;
      if (!isSuperAdminUser(clerkUser)) {
         await client.users.deleteUser(targetUserId);
         clerkProfileDeleted = true;
      }
    } catch (e: any) {
      if (e.status === 404 || (e.errors && e.errors[0]?.code === 'resource_not_found')) {
        logger.info(`Clerk user ${targetUserId} already deleted or not found.`);
      } else {
        logger.error('Unexpected error fetching or deleting user from Clerk during GDPR erasure', e);
      }
    }

    let ordersAnonymized = 0;
    let submissionsDeleted = 0;
    let auditLogsRedacted = 0;
    let paymentSlipUrls: string[] = [];

    await db.transaction(async (tx) => {
      const orders = await tx.select().from(schema.simulatedOrders).where(eq(schema.simulatedOrders.customerUserId, targetUserId));
      ordersAnonymized = orders.length;
      paymentSlipUrls = orders.map(o => o.paymentSlipUrl).filter(Boolean) as string[];

      if (orders.length > 0) {
        await tx.update(schema.simulatedOrders).set({
          customerName: 'GDPR REDACTED',
          customerEmail: 'redacted@example.com',
          customerUserId: null,
          shippingAddress: 'REDACTED',
          shippingAddressLine2: 'REDACTED',
          shippingCity: 'REDACTED',
          shippingState: 'REDACTED',
          shippingPostalCode: 'REDACTED',
          shippingCountry: 'REDACTED',
          shippingPhone: 'REDACTED',
          shippingPhone2: 'REDACTED',
          paymentSlipUrl: null,
          updatedAt: new Date(),
        }).where(eq(schema.simulatedOrders.customerUserId, targetUserId));
      }

      if (email) {
        const allSubmissions = await tx.select({ id: schema.contactSubmissions.id, email: schema.contactSubmissions.email }).from(schema.contactSubmissions);
        const toDeleteIds = allSubmissions
          .filter(sub => sub.email && sub.email.trim().toLowerCase() === email)
          .map(sub => sub.id);

        if (toDeleteIds.length > 0) {
          await tx.delete(schema.contactSubmissions).where(inArray(schema.contactSubmissions.id, toDeleteIds));
          submissionsDeleted = toDeleteIds.length;
        }
      }

      // Customer Carts
      await tx.delete(schema.customerCarts).where(eq(schema.customerCarts.userId, targetUserId));
      
      // Branch Members
      await tx.delete(schema.branchMembers).where(eq(schema.branchMembers.memberUserId, targetUserId));

      // Audit logs
      const userLogs = await tx.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.userId, targetUserId));
      if (userLogs.length > 0) {
          await tx.update(schema.auditLogs).set({
              userId: 'gdpr_redacted',
              ipAddress: null,
              userAgent: null,
          }).where(eq(schema.auditLogs.userId, targetUserId));
          auditLogsRedacted = userLogs.length;
      }
      
      // Billing receipts cashier anonymization
      await tx.update(schema.billingReceipts)
      .set({ cashierUserId: 'gdpr_redacted' })
      .where(eq(schema.billingReceipts.cashierUserId, targetUserId));

      // Additional schemas if they exist
      if ('reviews' in schema) {
          await tx.update((schema as any).reviews).set({
            userName: 'GDPR REDACTED',
            userImageUrl: null,
            comment: '[REDACTED]',
          }).where(eq((schema as any).reviews.userId, targetUserId));
      }

      if ('wishlists' in schema) {
          await tx.delete((schema as any).wishlists).where(eq((schema as any).wishlists.userId, targetUserId));
      }

      if ('questions' in schema) {
          await tx.update((schema as any).questions).set({
            userName: 'GDPR REDACTED',
            userImageUrl: null,
          }).where(eq((schema as any).questions.userId, targetUserId));
      }
    });

    if (paymentSlipUrls.length > 0) {
      const { createSupabaseAdminClient, isSupabaseStorageConfigured } = await import('@/shared/storage/admin-client');
      if (isSupabaseStorageConfigured()) {
        const { PAYMENT_SLIPS_BUCKET } = await import('@/shared/storage/config');
        const supabase = createSupabaseAdminClient();
        await supabase.storage.from(PAYMENT_SLIPS_BUCKET).remove(paymentSlipUrls);
      }
    }

    await logAuditAction({
      userId: adminUserId,
      action: 'API_GDPR_ERASURE_BACKGROUND',
      targetType: 'data_subject_request',
      targetId: targetUserId,
      metadata: { ordersAnonymized, submissionsDeleted, clerkProfileDeleted, auditLogsRedacted },
      strict: true,
    });

    logger.info(`GDPR background erasure completed successfully for ${targetUserId}`);

    // Mark as done (24h TTL) and release the processing lock
    await redis.set(`erase:msg_id:${messageId}:done`, "1", { ex: 86400 });
    await redis.del(`erase:msg_id:${messageId}:lock`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('GDPR Background Erasure Error', error);
    
    // Release the lock so QStash retries can process it
    try {
      await redis.del(`erase:msg_id:${messageId}:lock`);
    } catch (e) {
      logger.error('Failed to release idempotency lock', e);
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = async (req: NextRequest) => {
  return verifySignatureAppRouter(handler)(req);
};
