import { NextRequest, NextResponse } from 'next/server';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { logAuditAction } from '@/shared/audit/logger';
import { clerkClient } from '@clerk/nextjs/server';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';
import { logger } from '@/shared/logging/logger';

export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await checkSuperAdmin();
    const targetUserId = req.nextUrl.searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
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

    const orders = await db.select().from(schema.simulatedOrders).where(eq(schema.simulatedOrders.customerUserId, targetUserId));
    const ordersAnonymized = orders.length;
    
    let supabase: any = null;
    const { createSupabaseAdminClient, isSupabaseStorageConfigured } = await import('@/shared/storage/admin-client');
    const { PAYMENT_SLIPS_BUCKET } = await import('@/shared/storage/config');

    const paymentSlipUrls = orders.map(o => o.paymentSlipUrl).filter(Boolean) as string[];
    if (paymentSlipUrls.length > 0 && isSupabaseStorageConfigured()) {
      supabase = createSupabaseAdminClient();
      await supabase.storage.from(PAYMENT_SLIPS_BUCKET).remove(paymentSlipUrls);
    }

    if (orders.length > 0) {
      await db.update(schema.simulatedOrders).set({
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

    let submissionsDeleted = 0;
    if (email) {
      const allSubmissions = await db.select({ id: schema.contactSubmissions.id, email: schema.contactSubmissions.email }).from(schema.contactSubmissions);
      const toDeleteIds = allSubmissions
        .filter(sub => sub.email && sub.email.trim().toLowerCase() === email)
        .map(sub => sub.id);

      if (toDeleteIds.length > 0) {
        await db.delete(schema.contactSubmissions).where(inArray(schema.contactSubmissions.id, toDeleteIds));
        submissionsDeleted = toDeleteIds.length;
      }
    }

    // Customer Carts
    try { await db.delete(schema.customerCarts).where(eq(schema.customerCarts.userId, targetUserId)); } catch (e) {}
    
    // Branch Members
    try { await db.delete(schema.branchMembers).where(eq(schema.branchMembers.memberUserId, targetUserId)); } catch (e) {}

    // Audit logs
    let auditLogsRedacted = 0;
    try {
        const userLogs = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where(eq(schema.auditLogs.userId, targetUserId));
        if (userLogs.length > 0) {
            await db.update(schema.auditLogs).set({
                userId: 'gdpr_redacted',
                ipAddress: null,
                userAgent: null,
            }).where(eq(schema.auditLogs.userId, targetUserId));
            auditLogsRedacted = userLogs.length;
        }
    } catch (e) {}
    
    // Billing receipts cashier anonymization
    try {
        await db.update(schema.billingReceipts)
        .set({ cashierUserId: 'gdpr_redacted' })
        .where(eq(schema.billingReceipts.cashierUserId, targetUserId));
    } catch (e) {}

    // Additional schemas if they exist
    try {
        await db.update((schema as any).reviews).set({
          userName: 'GDPR REDACTED',
          userImageUrl: null,
          comment: '[REDACTED]',
        }).where(eq((schema as any).reviews.userId, targetUserId));
    } catch(e) {}

    try {
        await db.delete((schema as any).wishlists).where(eq((schema as any).wishlists.userId, targetUserId));
    } catch(e) {}

    try {
        await db.update((schema as any).questions).set({
          userName: 'GDPR REDACTED',
          userImageUrl: null,
        }).where(eq((schema as any).questions.userId, targetUserId));
    } catch(e) {}

    await logAuditAction({
      userId: adminUser.id,
      action: 'API_GDPR_ERASURE',
      targetType: 'data_subject_request',
      targetId: targetUserId,
      metadata: { ordersAnonymized, submissionsDeleted, clerkProfileDeleted, auditLogsRedacted },
      strict: true,
    });

    return NextResponse.json({ success: true, message: 'User data erased successfully' });
  } catch (error) {
    logger.error('GDPR Erasure Error', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
