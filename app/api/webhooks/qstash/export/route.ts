import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { logger } from "@/shared/logging/logger";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Redis } from "@upstash/redis";
import { createSupabaseAdminClient } from "@/shared/storage/admin-client";
import { GDPR_EXPORTS_BUCKET } from "@/shared/storage/config";
import { escapeHtml } from "@/shared/email/smtp-client";
import { sendSystemHtmlEmail } from "@/shared/email/delivery";
import { getQStashClient } from "@/shared/security/qstash-client";
import { logAuditAction } from "@/shared/audit/logger";

import { z } from "zod/v3";

export const maxDuration = 300;

const exportPayloadSchema = z.object({
  targetUserId: z.string().min(1).max(128),
  adminUserId: z.string().min(1).max(128),
  adminEmail: z.string().email(),
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

async function handler(req: NextRequest) {
  const messageId = req.headers.get("upstash-message-id");
  if (!messageId) {
    return NextResponse.json({ error: "Missing upstash-message-id" }, { status: 400 });
  }

  try {
    // Check if already successfully processed
    const isDone = await redis.get(`export:msg_id:${messageId}:done`);
    if (isDone) {
      logger.info(`Idempotency caught duplicate execution for QStash message ${messageId}`);
      return NextResponse.json(
        { success: true, message: "Duplicate message ignored" },
        { status: 200 },
      );
    }

    // Acquire a short-lived processing lock to prevent concurrent identical deliveries
    const lock = await redis.set(`export:msg_id:${messageId}:lock`, "1", { nx: true, ex: 120 });
    if (!lock) {
      logger.warn(
        `QStash message ${messageId} is currently being processed. Returning 409 to trigger retry.`,
      );
      return NextResponse.json({ error: "Currently processing" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = exportPayloadSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn("GDPR export webhook received invalid payload", {
        error: parsed.error.issues[0]?.message,
      });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { targetUserId, adminUserId, adminEmail } = parsed.data;

    // 1. simulatedOrders
    const orders = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.customerUserId, targetUserId));

    type OrderItem = typeof schema.simulatedOrderItems.$inferSelect;
    type PopulatedOrder = typeof schema.simulatedOrders.$inferSelect & { items: OrderItem[] };
    let populatedOrders: PopulatedOrder[] = [];

    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);

      const allItems: OrderItem[] = [];
      const CHUNK_SIZE = 100;
      for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
        const chunkIds = orderIds.slice(i, i + CHUNK_SIZE);
        const itemsChunk = await db
          .select()
          .from(schema.simulatedOrderItems)
          .where(inArray(schema.simulatedOrderItems.orderId, chunkIds));
        allItems.push(...itemsChunk);
      }

      const itemsByOrderId = allItems.reduce(
        (acc, item) => {
          if (!acc[item.orderId]) acc[item.orderId] = [];
          acc[item.orderId].push(item);
          return acc;
        },
        {} as Record<string, (typeof allItems)[0][]>,
      );

      populatedOrders = orders.map((order) => ({
        ...order,
        items: itemsByOrderId[order.id] || [],
      }));
    }

    // 2. clerk user to get email for contact submissions
    const client = await clerkClient();
    let clerkUser = null;
    let contactSubmissions: (typeof schema.contactSubmissions.$inferSelect)[] = [];
    try {
      clerkUser = await client.users.getUser(targetUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (email) {
        contactSubmissions = await db
          .select()
          .from(schema.contactSubmissions)
          .where(
            sql`lower(trim(${schema.contactSubmissions.email})) = ${email.trim().toLowerCase()}`,
          );
      }
    } catch (e) {
      // User might be deleted from clerk already or error
    }

    // 3-6. Fetch Carts, Branch Members, Audit Logs, Reviews, Questions, Wishlists concurrently
    let cart = null;
    let branchMemberships: (typeof schema.branchMembers.$inferSelect)[] = [];
    let logs: Array<Omit<typeof schema.auditLogs.$inferSelect, "ipAddress" | "userAgent">> = [];
    let reviews: (typeof schema.reviews.$inferSelect)[] = [];
    let questions: (typeof schema.questions.$inferSelect)[] = [];
    let wishlists: (typeof schema.wishlists.$inferSelect)[] = [];

    const queries: any[] = [
      db.select().from(schema.customerCarts).where(eq(schema.customerCarts.userId, targetUserId)),
      db
        .select()
        .from(schema.branchMembers)
        .where(eq(schema.branchMembers.memberUserId, targetUserId)),
      db
        .select({
          id: schema.auditLogs.id,
          userId: schema.auditLogs.userId,
          action: schema.auditLogs.action,
          targetType: schema.auditLogs.targetType,
          targetId: schema.auditLogs.targetId,
          metadata: schema.auditLogs.metadata,
          createdAt: schema.auditLogs.createdAt,
        })
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.userId, targetUserId)),
    ];

    queries.push(db.select().from(schema.reviews).where(eq(schema.reviews.userId, targetUserId)));
    queries.push(
      db.select().from(schema.questions).where(eq(schema.questions.userId, targetUserId)),
    );
    queries.push(
      db.select().from(schema.wishlists).where(eq(schema.wishlists.userId, targetUserId)),
    );

    // Fail loud on any DB errors to prevent silent data loss
    const results = await Promise.all(queries);

    let idx = 0;
    if (results[idx] && results[idx].length > 0) cart = results[idx][0];
    idx++;
    branchMemberships = results[idx++];
    logs = results[idx++];

    reviews = results[idx++];
    questions = results[idx++];
    wishlists = results[idx++];

    const sanitizedOrders = populatedOrders.map(({ customerEmailHash, ...rest }) => rest);
    const sanitizedSubmissions = contactSubmissions.map(({ emailHash, ...rest }) => rest);

    const hasRedactionEvent = logs.some((l) => l.action === "GDPR_REDACTION");
    const sanitizedLogs = hasRedactionEvent
      ? logs.map((l) => ({
          ...l,
          userId: "gdpr_redacted",
        }))
      : logs;

    const exportData = {
      userId: targetUserId,
      orders: sanitizedOrders,
      contactSubmissions: sanitizedSubmissions,
      cart,
      branchMemberships,
      reviews,
      questions,
      wishlists,
      auditLogs: sanitizedLogs,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const jsonBuffer = Buffer.from(jsonString, "utf-8");

    // Generate unique storage path
    const storagePath = `${targetUserId}_${Date.now()}.json`;
    const supabase = createSupabaseAdminClient();

    const { error: uploadError } = await supabase.storage
      .from(GDPR_EXPORTS_BUCKET)
      .upload(storagePath, jsonBuffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    const appUrl =
      process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Publish cleanup job (delayed 24h)
    await getQStashClient().publishJSON({
      url: `${appUrl}/api/webhooks/qstash/cleanup`,
      body: { storagePath },
      delay: "24h",
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

    const systemName = process.env.NEXT_PUBLIC_APP_NAME || "Platform";
    const emailResult = await sendSystemHtmlEmail(
      adminEmail,
      `[${systemName}] GDPR Export Ready: ${targetUserId}`,
      emailHtml,
    );

    if (!emailResult.success) {
      logger.error("GDPR export notification email failed — admin not notified", {
        adminEmail,
        targetUserId,
        error: emailResult.error,
        tags: { alert: "gdpr_notification_failure" },
      });
      throw new Error(`Failed to send GDPR notification email: ${emailResult.error}`);
    }

    logger.info(`GDPR export completed successfully for ${targetUserId}`);

    await logAuditAction({
      userId: adminUserId,
      action: "API_GDPR_EXPORT_FULFILLED",
      targetType: "data_subject_request",
      targetId: targetUserId,
      metadata: { storagePath },
    });

    // Mark as done (24h TTL) and release the processing lock
    await redis.set(`export:msg_id:${messageId}:done`, "1", { ex: 86400 });
    await redis.del(`export:msg_id:${messageId}:lock`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("GDPR Export Worker Error", error);

    // Release the lock so QStash retries can process it
    try {
      await redis.del(`export:msg_id:${messageId}:lock`);
    } catch (e) {
      logger.error("Failed to release idempotency lock", e);
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = async (req: NextRequest) => {
  return verifySignatureAppRouter(handler)(req);
};
