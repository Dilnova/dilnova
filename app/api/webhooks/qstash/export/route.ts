import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/shared/logging/logger';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Redis } from '@upstash/redis';
import { createSupabaseAdminClient } from '@/shared/storage/admin-client';
import { GDPR_EXPORTS_BUCKET } from '@/shared/storage/config';
import { escapeHtml } from '@/shared/email/smtp-client';
import { sendSystemHtmlEmail } from '@/shared/email/delivery';
import { Client as QStashClient } from '@upstash/qstash';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const qstash = new QStashClient({
  token: process.env.QSTASH_TOKEN || '',
});

async function handler(req: NextRequest) {
  try {
    const messageId = req.headers.get('upstash-message-id');
    if (!messageId) {
      return NextResponse.json({ error: 'Missing upstash-message-id' }, { status: 400 });
    }

    // Idempotency check: 86400s (24h) TTL
    const setnxResult = await redis.setnx(`export:msg_id:${messageId}`, "1");
    if (setnxResult === 0) {
      logger.info(`Idempotency caught duplicate execution for QStash message ${messageId}`);
      return NextResponse.json({ success: true, message: 'Duplicate message ignored' }, { status: 200 });
    }
    // Set expiry
    await redis.expire(`export:msg_id:${messageId}`, 86400);

    const body = await req.json();
    const { targetUserId, adminUserId, adminEmail } = body;

    if (!targetUserId || !adminUserId || !adminEmail) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. simulatedOrders
    const orders = await db.select().from(schema.simulatedOrders).where(eq(schema.simulatedOrders.customerUserId, targetUserId));
    let populatedOrders: any[] = [];
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const allItems = await db.select().from(schema.simulatedOrderItems).where(inArray(schema.simulatedOrderItems.orderId, orderIds));
      
      const itemsByOrderId = allItems.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push(item);
        return acc;
      }, {} as Record<string, typeof allItems[0][]>);
      
      populatedOrders = orders.map(order => ({
        ...order,
        items: itemsByOrderId[order.id] || []
      }));
    }

    // 2. clerk user to get email for contact submissions
    const client = await clerkClient();
    let clerkUser = null;
    let contactSubmissions: any[] = [];
    try {
      clerkUser = await client.users.getUser(targetUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (email) {
         contactSubmissions = await db.select()
           .from(schema.contactSubmissions)
           .where(sql`lower(trim(${schema.contactSubmissions.email})) = ${email.trim().toLowerCase()}`);
      }
    } catch (e) {
      // User might be deleted from clerk already or error
    }

    // 3-6. Fetch Carts, Branch Members, Audit Logs, Reviews, Questions, Wishlists concurrently
    let cart = null;
    let branchMemberships: any[] = [];
    let logs: any[] = [];
    let reviews: any[] = [];
    let questions: any[] = [];
    let wishlists: any[] = [];

    const results = await Promise.allSettled([
      db.select().from(schema.customerCarts).where(eq(schema.customerCarts.userId, targetUserId)),
      db.select().from(schema.branchMembers).where(eq(schema.branchMembers.memberUserId, targetUserId)),
      db.select().from(schema.auditLogs).where(eq(schema.auditLogs.userId, targetUserId)),
      // Ignore type errors for dynamic schema access used in this specific route
      db.select().from((schema as any).reviews).where(eq((schema as any).reviews.userId, targetUserId)),
      db.select().from((schema as any).questions).where(eq((schema as any).questions.userId, targetUserId)),
      db.select().from((schema as any).wishlists).where(eq((schema as any).wishlists.userId, targetUserId)),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value.length > 0) cart = results[0].value[0];
    if (results[1].status === 'fulfilled') branchMemberships = results[1].value;
    if (results[2].status === 'fulfilled') logs = results[2].value;
    if (results[3].status === 'fulfilled') reviews = results[3].value;
    if (results[4].status === 'fulfilled') questions = results[4].value;
    if (results[5].status === 'fulfilled') wishlists = results[5].value;

    const exportData = {
      userId: targetUserId,
      orders: populatedOrders,
      contactSubmissions,
      cart,
      branchMemberships,
      reviews,
      questions,
      wishlists,
      auditLogs: logs
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const jsonBuffer = Buffer.from(jsonString, 'utf-8');

    // Generate unique storage path
    const storagePath = `${targetUserId}_${Date.now()}.json`;
    const supabase = createSupabaseAdminClient();

    const { error: uploadError } = await supabase.storage
      .from(GDPR_EXPORTS_BUCKET)
      .upload(storagePath, jsonBuffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Publish cleanup job (delayed 24h)
    await qstash.publishJSON({
      url: `${appUrl}/api/webhooks/qstash/cleanup`,
      body: { storagePath },
      delay: '24h',
    });

    // Email admin the download link to the internal superadmin route
    const downloadPageUrl = `${appUrl}/superadmin/gdpr/export/${encodeURIComponent(targetUserId)}?file=${encodeURIComponent(storagePath)}`;

    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>GDPR Export Ready</h2>
        <p>The data export for user ID <strong>${escapeHtml(targetUserId)}</strong> is now ready for download.</p>
        <p>This export contains sensitive PII and must be handled securely.</p>
        <a href="${downloadPageUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7e22ce; color: white; text-decoration: none; border-radius: 5px;">
          Go to Secure Download Portal
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          This file will be automatically purged from our systems in 24 hours.
        </p>
      </div>
    `;

    const systemName = process.env.NEXT_PUBLIC_APP_NAME || 'Platform';
    await sendSystemHtmlEmail(
      adminEmail,
      `[${systemName}] GDPR Export Ready: ${targetUserId}`,
      emailHtml
    );

    logger.info(`GDPR export completed successfully for ${targetUserId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('GDPR Export Worker Error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
