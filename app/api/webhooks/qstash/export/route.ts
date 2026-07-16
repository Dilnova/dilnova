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
  const messageId = req.headers.get('upstash-message-id');
  if (!messageId) {
    return NextResponse.json({ error: 'Missing upstash-message-id' }, { status: 400 });
  }

  try {
    // Check if already successfully processed
    const isDone = await redis.get(`export:msg_id:${messageId}:done`);
    if (isDone) {
      logger.info(`Idempotency caught duplicate execution for QStash message ${messageId}`);
      return NextResponse.json({ success: true, message: 'Duplicate message ignored' }, { status: 200 });
    }

    // Acquire a short-lived processing lock to prevent concurrent identical deliveries
    const lock = await redis.set(`export:msg_id:${messageId}:lock`, "1", { nx: true, ex: 120 });
    if (!lock) {
      logger.warn(`QStash message ${messageId} is currently being processed. Returning 409 to trigger retry.`);
      return NextResponse.json({ error: 'Currently processing' }, { status: 409 });
    }

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
      
      const allItems: any[] = [];
      const CHUNK_SIZE = 100;
      for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
        const chunkIds = orderIds.slice(i, i + CHUNK_SIZE);
        const itemsChunk = await db.select().from(schema.simulatedOrderItems).where(inArray(schema.simulatedOrderItems.orderId, chunkIds));
        allItems.push(...itemsChunk);
      }
      
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

    const queries: any[] = [
      db.select().from(schema.customerCarts).where(eq(schema.customerCarts.userId, targetUserId)),
      db.select().from(schema.branchMembers).where(eq(schema.branchMembers.memberUserId, targetUserId)),
      db.select().from(schema.auditLogs).where(eq(schema.auditLogs.userId, targetUserId)),
    ];

    let hasReviews = false;
    let hasQuestions = false;
    let hasWishlists = false;

    if ('reviews' in schema) {
      hasReviews = true;
      queries.push(db.select().from((schema as any).reviews).where(eq((schema as any).reviews.userId, targetUserId)));
    }
    if ('questions' in schema) {
      hasQuestions = true;
      queries.push(db.select().from((schema as any).questions).where(eq((schema as any).questions.userId, targetUserId)));
    }
    if ('wishlists' in schema) {
      hasWishlists = true;
      queries.push(db.select().from((schema as any).wishlists).where(eq((schema as any).wishlists.userId, targetUserId)));
    }

    // Fail loud on any DB errors to prevent silent data loss
    const results = await Promise.all(queries);

    let idx = 0;
    if (results[idx] && results[idx].length > 0) cart = results[idx][0];
    idx++;
    branchMemberships = results[idx++];
    logs = results[idx++];
    
    if (hasReviews) reviews = results[idx++];
    if (hasQuestions) questions = results[idx++];
    if (hasWishlists) wishlists = results[idx++];

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

    // Mark as done (24h TTL) and release the processing lock
    await redis.set(`export:msg_id:${messageId}:done`, "1", { ex: 86400 });
    await redis.del(`export:msg_id:${messageId}:lock`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('GDPR Export Worker Error', error);
    
    // Release the lock so QStash retries can process it
    try {
      await redis.del(`export:msg_id:${messageId}:lock`);
    } catch (e) {
      logger.error('Failed to release idempotency lock', e);
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
