import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { getChatRedisClient } from "@/features/chat/pubsub";
import { logger } from "@/shared/logging/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify conversation exists and access is permitted
  const convRows = await db
    .select()
    .from(schema.orderConversations)
    .where(eq(schema.orderConversations.id, conversationId))
    .limit(1);

  if (convRows.length === 0) {
    // Graceful response for deleted conversation (addresses edge case from forensic review)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "conversation_deleted" })}\n\n`),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const conversation = convRows[0];

  // Access validation:
  const isCustomer = conversation.customerUserId === userId;
  const isVendor = orgId && conversation.orgId === orgId;

  if (!isCustomer && !isVendor) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If accessing as vendor member (and not as the customer who owns the order), enforce branch scope
  if (!isCustomer && isVendor && orgRole === "org:member" && conversation.branchId) {
    const membership = await db
      .select({ id: schema.branchMembers.id })
      .from(schema.branchMembers)
      .where(
        and(
          eq(schema.branchMembers.branchId, conversation.branchId),
          eq(schema.branchMembers.memberUserId, userId),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: Not in assigned branch" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const encoder = new TextEncoder();
  let isAborted = false;
  let intervalId: NodeJS.Timeout | null = null;
  let keepAliveId: NodeJS.Timeout | null = null;
  let maxDurationId: NodeJS.Timeout | null = null;
  let lastCheckedTimestamp = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connected event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", conversationId, status: conversation.status })}\n\n`,
        ),
      );

      // Graceful timeout after 25 seconds to prevent unbounded Serverless Function Active CPU accumulation
      maxDurationId = setTimeout(() => {
        if (isAborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "stream_end" })}\n\n`));
          cleanup();
          controller.close();
        } catch {
          cleanup();
        }
      }, 25000);

      // Keepalive ping every 12s
      keepAliveId = setInterval(() => {
        if (isAborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`));
        } catch {
          isAborted = true;
          cleanup();
        }
      }, 12000);

      // Poll check every 4 seconds for new messages or Redis event
      const redis = getChatRedisClient();

      intervalId = setInterval(async () => {
        if (isAborted) return;

        try {
          let hasNewEvent = false;

          if (redis) {
            const lastEventRaw = await redis.get<string>(`chat_last_event:${conversationId}`);
            if (lastEventRaw) {
              const parsed =
                typeof lastEventRaw === "string" ? JSON.parse(lastEventRaw) : lastEventRaw;
              if (parsed?.timestamp && parsed.timestamp > lastCheckedTimestamp) {
                lastCheckedTimestamp = parsed.timestamp;
                hasNewEvent = true;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
              }
            }
          }

          if (!hasNewEvent) {
            // Check if conversation status changed or conversation was deleted
            const currentConv = await db
              .select({
                status: schema.orderConversations.status,
                updatedAt: schema.orderConversations.updatedAt,
              })
              .from(schema.orderConversations)
              .where(eq(schema.orderConversations.id, conversationId))
              .limit(1);

            if (currentConv.length === 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "conversation_deleted" })}\n\n`),
              );
              cleanup();
              controller.close();
              return;
            }
          }
        } catch (error) {
          logger.warn("SSE polling error in chat stream", { conversationId, error });
        }
      }, 4000);
    },
    cancel() {
      isAborted = true;
      cleanup();
    },
  });

  function cleanup() {
    if (intervalId) clearInterval(intervalId);
    if (keepAliveId) clearInterval(keepAliveId);
    if (maxDurationId) clearTimeout(maxDurationId);
  }

  request.signal.addEventListener("abort", () => {
    isAborted = true;
    cleanup();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disables Nginx buffering on hosting platforms
    },
  });
}
