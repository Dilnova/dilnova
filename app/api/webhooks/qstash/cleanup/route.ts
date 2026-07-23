import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/shared/logging/logger";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Redis } from "@upstash/redis";
import { createSupabaseAdminClient } from "@/shared/storage/admin-client";
import { GDPR_EXPORTS_BUCKET } from "@/shared/storage/config";

export const maxDuration = 60;

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
    const isDone = await redis.get(`cleanup:msg_id:${messageId}:done`);
    if (isDone) {
      logger.info(`Idempotency caught duplicate execution for QStash message ${messageId}`);
      return NextResponse.json(
        { success: true, message: "Duplicate message ignored" },
        { status: 200 },
      );
    }

    // Acquire a short-lived processing lock to prevent concurrent identical deliveries
    const lock = await redis.set(`cleanup:msg_id:${messageId}:lock`, "1", { nx: true, ex: 120 });
    if (!lock) {
      logger.warn(
        `QStash message ${messageId} is currently being processed. Returning 409 to trigger retry.`,
      );
      return NextResponse.json({ error: "Currently processing" }, { status: 409 });
    }

    const body = await req.json();
    const { storagePath } = body;

    if (!storagePath) {
      return NextResponse.json({ error: "Missing storagePath" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(GDPR_EXPORTS_BUCKET).remove([storagePath]);

    if (error && !error.message.includes("not found")) {
      throw new Error(`Failed to delete GDPR export: ${error.message}`);
    }

    logger.info(`Cleaned up GDPR export file: ${storagePath}`);

    // Mark as done (48h TTL) and release the processing lock
    await redis.set(`cleanup:msg_id:${messageId}:done`, "1", { ex: 86400 * 2 });
    await redis.del(`cleanup:msg_id:${messageId}:lock`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("GDPR Cleanup Worker Error", error);

    // Release the lock so QStash retries can process it
    try {
      await redis.del(`cleanup:msg_id:${messageId}:lock`);
    } catch (e) {
      logger.error("Failed to release idempotency lock", e);
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = async (req: NextRequest) => {
  return verifySignatureAppRouter(handler)(req);
};
