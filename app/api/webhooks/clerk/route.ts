import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { logger } from "@/shared/logging/logger";
import { handleApiError } from "@/shared/errors/error-handler";
import { invalidateClerkUserCache, invalidateClerkOrgCache } from "@/shared/auth/clerk-cache";
import { Redis } from "@upstash/redis";
import { readUpstashEnv } from "@/shared/security/upstash-health";
import { getQStashClient } from "@/shared/security/qstash-client";

const processedWebhooksMemory = new Set<string>();

function verifyClerkWebhookSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  webhookSecret: string,
): boolean {
  try {
    // Decodes the base64 part of the key
    const secretKey = webhookSecret.startsWith("whsec_")
      ? webhookSecret.substring("whsec_".length)
      : webhookSecret;

    const keyBuffer = Buffer.from(secretKey, "base64");

    // Verify timestamp (5-minute tolerance)
    const timestampMs = parseInt(svixTimestamp, 10) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      logger.warn("Clerk webhook verification failed: Timestamp drift too large", {
        svixTimestamp,
        now: Math.floor(now / 1000),
      });
      return false;
    }

    // Construct signature input
    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;

    // Compute HMAC-SHA256
    const hmac = crypto.createHmac("sha256", keyBuffer);
    const computedSignature = hmac.update(toSign).digest("base64");

    // Compare with timing-safe comparison
    const computedBuffer = Buffer.from(computedSignature, "base64");
    const signatureParts = svixSignature.split(" ");

    for (const part of signatureParts) {
      const [version, signature] = part.split(",");
      if (version === "v1") {
        const receivedBuffer = Buffer.from(signature, "base64");
        if (
          computedBuffer.length === receivedBuffer.length &&
          crypto.timingSafeEqual(computedBuffer, receivedBuffer)
        ) {
          return true;
        }
      }
    }
  } catch (error: unknown) {
    const apiError = handleApiError(error, "Error verifying Clerk webhook signature");
    logger.error(apiError.message, error);
  }
  return false;
}

export async function POST(req: NextRequest) {
  let webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (process.env.VERCEL_ENV === "preview") {
    if (process.env.PREVIEW_CLERK_WEBHOOK_SECRET) {
      webhookSecret = process.env.PREVIEW_CLERK_WEBHOOK_SECRET;
    } else {
      logger.warn(
        "Preview deployment using production CLERK_WEBHOOK_SECRET. It is highly recommended to set PREVIEW_CLERK_WEBHOOK_SECRET in Vercel for preview environments to avoid cross-contamination.",
      );
    }
  }

  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET is not configured on the server", undefined, {
      tags: { alert: "webhook_failure", source: "clerk" },
    });
    return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 500 });
  }

  // Get Svix headers
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn("Clerk webhook request missing required Svix headers");
    return NextResponse.json({ error: "Missing required Svix headers." }, { status: 400 });
  }

  // Get raw body text
  const payload = await req.text();

  // Verify signature
  const isValid = verifyClerkWebhookSignature(
    payload,
    svixId,
    svixTimestamp,
    svixSignature,
    webhookSecret,
  );

  if (!isValid) {
    logger.warn("Invalid Clerk webhook signature", { svixId });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  // Idempotency check
  const { url, token } = readUpstashEnv();

  // Helper for DB fallback
  const fallbackToDbIdempotency = async () => {
    try {
      const { db } = await import("@/shared/db/client");
      const { processedWebhooks } = await import("@/shared/db/schema");

      logger.info("Falling back to database for webhook idempotency check", { svixId });
      const result = await db
        .insert(processedWebhooks)
        .values({ id: svixId, source: "clerk" })
        .onConflictDoNothing({ target: processedWebhooks.id })
        .returning({ id: processedWebhooks.id });

      if (result.length === 0) {
        logger.warn("Clerk webhook duplicate detected via DB fallback, ignoring replay", {
          svixId,
        });
        return true; // Is duplicate
      }
      return false; // Not duplicate
    } catch (dbError: unknown) {
      const apiError = handleApiError(dbError, "Database fallback for webhook idempotency failed");
      logger.error(apiError.message, dbError, {
        tags: { alert: "webhook_failure", source: "clerk" },
      });
      throw dbError; // Fail closed if even DB fails
    }
  };

  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      const redisKey = `clerk_webhook_processed:${svixId}`;
      const setCmd = await redis.set(redisKey, "1", { ex: 600, nx: true });
      if (!setCmd) {
        logger.warn("Clerk webhook duplicate detected via Redis, ignoring replay", { svixId });
        return NextResponse.json({ success: true, message: "Already processed" });
      }
    } catch (e: unknown) {
      const apiError = handleApiError(
        e,
        "Redis idempotency check failed, attempting database fallback",
      );
      logger.error(apiError.message, e, { tags: { source: "clerk" } });
      try {
        const isDuplicate = await fallbackToDbIdempotency();
        if (isDuplicate) {
          return NextResponse.json({ success: true, message: "Already processed" });
        }
      } catch (dbError: unknown) {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }
      }
    }
  } else {
    try {
      const isDuplicate = await fallbackToDbIdempotency();
      if (isDuplicate) {
        return NextResponse.json({ success: true, message: "Already processed" });
      }
    } catch (e: unknown) {
      if (process.env.NODE_ENV === "production") {
        const apiError = handleApiError(
          e,
          "Redis and DB idempotency check both failed in production",
        );
        logger.error(apiError.message, undefined, {
          tags: { alert: "webhook_failure", source: "clerk" },
        });
        return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
      }

      // Memory fallback for local dev if DB also fails
      if (processedWebhooksMemory.has(svixId)) {
        logger.warn("Clerk webhook duplicate detected via memory, ignoring replay", { svixId });
        return NextResponse.json({ success: true, message: "Already processed" });
      }
      processedWebhooksMemory.add(svixId);
      setTimeout(() => processedWebhooksMemory.delete(svixId), 10 * 60 * 1000);
    }
  }

  try {
    const event = JSON.parse(payload);
    const eventTypeRaw = event.type;
    const data = event.data;
    const allowedEventTypes = new Set([
      "user.updated",
      "user.created",
      "user.deleted",
      "organizationMembership.created",
      "organizationMembership.updated",
      "organizationMembership.deleted",
      "organization.updated",
      "organization.deleted",
      "user.failed_attempt",
      "session.locked",
    ]);
    const eventType =
      typeof eventTypeRaw === "string" && allowedEventTypes.has(eventTypeRaw)
        ? eventTypeRaw
        : "unknown";

    logger.info(`Received Clerk webhook: ${eventType}`, { eventId: svixId });

    if (eventType === "user.updated" || eventType === "user.created") {
      const userId = data.id;
      if (userId) {
        invalidateClerkUserCache(userId);
      }
    } else if (eventType === "user.deleted") {
      const userId = data.id;
      if (userId) {
        invalidateClerkUserCache(userId);
        const qstash = getQStashClient();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await qstash.publishJSON({
          url: `${appUrl}/api/webhooks/qstash/erase`,
          body: { targetUserId: userId, adminUserId: "system_webhook" },
        });
        logger.info(`Dispatched background GDPR erasure for deleted user ${userId}`);
      }
    } else if (
      eventType === "organizationMembership.created" ||
      eventType === "organizationMembership.updated" ||
      eventType === "organizationMembership.deleted"
    ) {
      const orgId = data.organization?.id;
      const userId = data.public_user_data?.user_id;

      if (orgId) {
        invalidateClerkOrgCache(orgId);
      }
      if (userId) {
        invalidateClerkUserCache(userId);
      }
    } else if (eventType === "organization.updated") {
      const orgId = data.id;
      if (orgId) {
        invalidateClerkOrgCache(orgId);
      }
    } else if (eventType === "organization.deleted") {
      const orgId = data.id;
      if (orgId) {
        invalidateClerkOrgCache(orgId);
        const qstash = getQStashClient();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await qstash.publishJSON({
          url: `${appUrl}/api/webhooks/qstash/erase-org`,
          body: { targetOrgId: orgId, adminUserId: "system_webhook" },
        });
        logger.info(`Dispatched background erasure for deleted organization ${orgId}`);
      }
    } else if (eventType === "user.failed_attempt") {
      const userId = data.id || data.user_id || "unknown";
      const { logAuditAction } = await import("@/shared/audit/logger");
      await logAuditAction({
        userId: userId !== "unknown" ? userId : "system",
        action: "AUTH_FAILED",
        targetType: "membership",
        targetId: userId,
        metadata: {
          reason: data.last_sign_in_attempt?.error?.code || data.error?.code || "failed_attempt",
        },
        strict: false,
      });
      logger.warn("Clerk authentication failed attempt", { userId });
    } else if (eventType === "session.locked") {
      const userId = data.user_id || data.id || "unknown";
      const { logAuditAction } = await import("@/shared/audit/logger");
      await logAuditAction({
        userId: userId !== "unknown" ? userId : "system",
        action: "ACCOUNT_LOCKED",
        targetType: "membership",
        targetId: userId,
        metadata: { reason: "session_locked" },
        strict: false,
      });
      logger.warn("Clerk account session locked", { userId });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const apiError = handleApiError(error, "Failed to process Clerk webhook event payload");
    logger.error(apiError.message, error, { tags: { alert: "webhook_failure", source: "clerk" } });
    return NextResponse.json({ error: "Failed to process webhook." }, { status: 500 });
  }
}
