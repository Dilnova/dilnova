"use server";

import { currentUser } from "@clerk/nextjs/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { authenticatedAction, vendorAction, ActionError } from "@/lib/safe-action";
import {
  createConversationSchema,
  sendMessageSchema,
  sendShippingQuoteSchema,
  sendAttachmentSchema,
  markConversationReadSchema,
  resolveConversationSchema,
  listMessagesSchema,
} from "./schema";
import { publishChatEvent } from "./pubsub";
import { listMessages } from "./queries";
import { logger } from "@/shared/logging/logger";
import { logAuditAction } from "@/shared/audit/logger";

/**
 * Helper: Resolve display name for the current user.
 */
async function resolveSenderDisplayName(
  userId: string,
  defaultFallback: string = "User",
): Promise<string> {
  try {
    const user = await currentUser();
    if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
      if (name) return name;
      if (user.username) return user.username;
      if (user.emailAddresses?.[0]?.emailAddress) {
        return user.emailAddresses[0].emailAddress.split("@")[0];
      }
    }
  } catch (error) {
    logger.warn("Could not fetch user details for chat message", { userId, error });
  }
  return defaultFallback;
}

/**
 * Helper: Validate that a user has permission to view/post in a conversation.
 * Returns the conversation and the sender's role.
 */
async function validateConversationAccess(
  conversationId: string,
  userId: string,
  orgId: string | null,
  orgRole: string | null,
): Promise<{
  conversation: typeof schema.orderConversations.$inferSelect;
  senderRole: "customer" | "vendor_admin" | "vendor_member";
}> {
  const rows = await db
    .select()
    .from(schema.orderConversations)
    .where(eq(schema.orderConversations.id, conversationId))
    .limit(1);

  if (rows.length === 0) {
    throw new ActionError("Conversation not found or has been deleted.");
  }

  const conversation = rows[0];

  // 1. Is caller the customer who owns this order conversation?
  if (conversation.customerUserId === userId) {
    return { conversation, senderRole: "customer" };
  }

  // 2. Is caller a vendor in the organization that owns this order?
  if (orgId && conversation.orgId === orgId) {
    if (orgRole === "org:admin") {
      return { conversation, senderRole: "vendor_admin" };
    }

    if (orgRole === "org:member") {
      // If conversation has a branchId, verify member is assigned to it
      if (conversation.branchId) {
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
          throw new ActionError("Unauthorized: You are not assigned to the branch for this order.");
        }
      }
      return { conversation, senderRole: "vendor_member" };
    }
  }

  throw new ActionError("Unauthorized: You do not have access to this conversation.");
}

/**
 * Action 1: Create or get an existing conversation for an order.
 * Customer initiates this by clicking "Message Vendor".
 */
export const createConversationAction = authenticatedAction
  .schema(createConversationSchema)
  .action(async ({ parsedInput: { orderId }, ctx: { userId } }) => {
    // 1. Check if conversation already exists
    const existing = await db
      .select()
      .from(schema.orderConversations)
      .where(
        and(
          eq(schema.orderConversations.orderId, orderId),
          eq(schema.orderConversations.customerUserId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: true, conversationId: existing[0].id, isNew: false };
    }

    // 2. Load order details and order items to find vendorOrgId and branch
    const orderRows = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new ActionError("Order not found.");
    }

    const order = orderRows[0];

    // Verify ownership: customerUserId must match or user session must match
    if (order.customerUserId && order.customerUserId !== userId) {
      throw new ActionError("Unauthorized: You can only message vendors for your own orders.");
    }

    // Find vendorOrgId from items
    const itemRows = await db
      .select({ vendorOrgId: schema.simulatedOrderItems.vendorOrgId })
      .from(schema.simulatedOrderItems)
      .where(eq(schema.simulatedOrderItems.orderId, orderId))
      .limit(1);

    if (itemRows.length === 0) {
      throw new ActionError("Order items not found.");
    }

    const vendorOrgId = itemRows[0].vendorOrgId;
    const branchId = order.pickupBranchId || order.originBranchId || null;

    // 3. Create conversation row
    const [newConv] = await db
      .insert(schema.orderConversations)
      .values({
        orderId,
        orgId: vendorOrgId,
        branchId,
        customerUserId: userId,
        status: "open",
        unreadByCustomer: 0,
        unreadByVendor: 1, // Marks unread for vendor on initiation
      })
      .returning({ id: schema.orderConversations.id });

    const customerName = await resolveSenderDisplayName(userId, "Customer");

    // 4. Insert an initial system welcome message
    await db.insert(schema.orderChatMessages).values({
      conversationId: newConv.id,
      orgId: vendorOrgId,
      senderUserId: userId,
      senderRole: "customer",
      senderName: customerName,
      content: `Hello! I have a question regarding order #${orderId.slice(0, 8)}.`,
      messageType: "text",
      isRead: false,
    });

    // 5. Publish real-time event
    await publishChatEvent(newConv.id, {
      type: "conversation_created",
      conversationId: newConv.id,
      orderId,
    });

    return { success: true, conversationId: newConv.id, isNew: true };
  });

/**
 * Action 2: Send a message in a conversation.
 */
export const sendMessageAction = authenticatedAction
  .schema(sendMessageSchema)
  .action(
    async ({
      parsedInput: {
        conversationId,
        content,
        messageType,
        metadata,
        attachmentUrl,
        attachmentName,
      },
      ctx: { userId, orgId, orgRole },
    }) => {
      const { conversation, senderRole } = await validateConversationAccess(
        conversationId,
        userId,
        orgId,
        orgRole,
      );

      if (conversation.status === "archived") {
        throw new ActionError("This conversation is archived and cannot receive new messages.");
      }

      const senderName = await resolveSenderDisplayName(
        userId,
        senderRole === "customer" ? "Customer" : "Store Staff",
      );

      const now = new Date();

      // 1. Insert chat message
      const [newMsg] = await db
        .insert(schema.orderChatMessages)
        .values({
          conversationId,
          orgId: conversation.orgId,
          senderUserId: userId,
          senderRole,
          senderName,
          content,
          messageType: messageType || "text",
          metadata: metadata || null,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          isRead: false,
          createdAt: now,
        })
        .returning();

      // 2. Update conversation: bump lastMessageAt and increment other party's unread counter
      const isSenderCustomer = senderRole === "customer";

      await db
        .update(schema.orderConversations)
        .set({
          lastMessageAt: now,
          status: "open", // Re-open if resolved
          unreadByVendor: isSenderCustomer
            ? sql`${schema.orderConversations.unreadByVendor} + 1`
            : schema.orderConversations.unreadByVendor,
          unreadByCustomer: !isSenderCustomer
            ? sql`${schema.orderConversations.unreadByCustomer} + 1`
            : schema.orderConversations.unreadByCustomer,
          updatedAt: now,
        })
        .where(eq(schema.orderConversations.id, conversationId));

      // 3. Publish real-time event via Redis
      await publishChatEvent(conversationId, {
        type: "new_message",
        messageId: newMsg.id,
        conversationId,
        senderRole,
      });

      return {
        success: true,
        message: {
          id: newMsg.id,
          conversationId: newMsg.conversationId,
          orgId: newMsg.orgId,
          senderUserId: newMsg.senderUserId,
          senderRole: newMsg.senderRole,
          senderName: newMsg.senderName,
          content: newMsg.content,
          messageType: newMsg.messageType,
          metadata: newMsg.metadata,
          attachmentUrl: newMsg.attachmentUrl,
          attachmentName: newMsg.attachmentName,
          isRead: newMsg.isRead,
          createdAt: newMsg.createdAt,
        },
      };
    },
  );

/**
 * Action 3: Send a structured shipping quote (Vendor only).
 */
export const sendShippingQuoteAction = vendorAction
  .schema(sendShippingQuoteSchema)
  .action(
    async ({
      parsedInput: { conversationId, fee, currency, carrier, zone, estimatedDays, notes },
      ctx: { userId, orgId, orgRole },
    }) => {
      const { conversation, senderRole } = await validateConversationAccess(
        conversationId,
        userId,
        orgId,
        orgRole,
      );

      const senderName = await resolveSenderDisplayName(userId, "Store Staff");
      const formattedFee = (fee / 100).toFixed(2);
      const content = `Shipping Fee Quote: ${currency} ${formattedFee}${carrier ? ` via ${carrier}` : ""}${estimatedDays ? ` (Est. ${estimatedDays} days)` : ""}${notes ? ` — ${notes}` : ""}`;

      const quoteMetadata = {
        fee,
        currency,
        carrier: carrier || "Standard Courier",
        zone: zone || "General",
        estimatedDays: estimatedDays || 3,
        notes: notes || "",
      };

      const now = new Date();

      const [newMsg] = await db
        .insert(schema.orderChatMessages)
        .values({
          conversationId,
          orgId: conversation.orgId,
          senderUserId: userId,
          senderRole,
          senderName,
          content,
          messageType: "shipping_quote",
          metadata: quoteMetadata,
          isRead: false,
          createdAt: now,
        })
        .returning();

      await db
        .update(schema.orderConversations)
        .set({
          lastMessageAt: now,
          status: "open",
          unreadByCustomer: sql`${schema.orderConversations.unreadByCustomer} + 1`,
          updatedAt: now,
        })
        .where(eq(schema.orderConversations.id, conversationId));

      await publishChatEvent(conversationId, {
        type: "new_message",
        messageId: newMsg.id,
        messageType: "shipping_quote",
        conversationId,
      });

      return { success: true, messageId: newMsg.id };
    },
  );

/**
 * Action 4: Send an attachment message (Customer or Vendor).
 */
export const sendAttachmentAction = authenticatedAction
  .schema(sendAttachmentSchema)
  .action(
    async ({
      parsedInput: { conversationId, attachmentUrl, attachmentName, content },
      ctx: { userId, orgId, orgRole },
    }) => {
      const { conversation, senderRole } = await validateConversationAccess(
        conversationId,
        userId,
        orgId,
        orgRole,
      );

      const senderName = await resolveSenderDisplayName(
        userId,
        senderRole === "customer" ? "Customer" : "Store Staff",
      );

      const now = new Date();
      const messageContent = content || `Attached file: ${attachmentName}`;

      const [newMsg] = await db
        .insert(schema.orderChatMessages)
        .values({
          conversationId,
          orgId: conversation.orgId,
          senderUserId: userId,
          senderRole,
          senderName,
          content: messageContent,
          messageType: "attachment",
          attachmentUrl,
          attachmentName,
          isRead: false,
          createdAt: now,
        })
        .returning();

      const isSenderCustomer = senderRole === "customer";

      await db
        .update(schema.orderConversations)
        .set({
          lastMessageAt: now,
          status: "open",
          unreadByVendor: isSenderCustomer
            ? sql`${schema.orderConversations.unreadByVendor} + 1`
            : schema.orderConversations.unreadByVendor,
          unreadByCustomer: !isSenderCustomer
            ? sql`${schema.orderConversations.unreadByCustomer} + 1`
            : schema.orderConversations.unreadByCustomer,
          updatedAt: now,
        })
        .where(eq(schema.orderConversations.id, conversationId));

      await publishChatEvent(conversationId, {
        type: "new_message",
        messageId: newMsg.id,
        messageType: "attachment",
        conversationId,
      });

      return { success: true, messageId: newMsg.id };
    },
  );

/**
 * Action 5: Mark conversation as read (resets unread counter for caller's role).
 */
export const markConversationReadAction = authenticatedAction
  .schema(markConversationReadSchema)
  .action(async ({ parsedInput: { conversationId }, ctx: { userId, orgId, orgRole } }) => {
    const { conversation, senderRole } = await validateConversationAccess(
      conversationId,
      userId,
      orgId,
      orgRole,
    );

    const isCustomer = senderRole === "customer";

    if (isCustomer && conversation.unreadByCustomer > 0) {
      await db
        .update(schema.orderConversations)
        .set({ unreadByCustomer: 0, updatedAt: new Date() })
        .where(eq(schema.orderConversations.id, conversationId));
    } else if (!isCustomer && conversation.unreadByVendor > 0) {
      await db
        .update(schema.orderConversations)
        .set({ unreadByVendor: 0, updatedAt: new Date() })
        .where(eq(schema.orderConversations.id, conversationId));
    }

    // Mark individual messages as read
    await db
      .update(schema.orderChatMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(schema.orderChatMessages.conversationId, conversationId),
          eq(schema.orderChatMessages.isRead, false),
        ),
      );

    return { success: true };
  });

/**
 * Action 6: Mark conversation as resolved (Vendor only).
 */
export const resolveConversationAction = vendorAction
  .schema(resolveConversationSchema)
  .action(async ({ parsedInput: { conversationId }, ctx: { userId, orgId, orgRole } }) => {
    const { conversation } = await validateConversationAccess(
      conversationId,
      userId,
      orgId,
      orgRole,
    );

    const now = new Date();

    await db
      .update(schema.orderConversations)
      .set({ status: "resolved", updatedAt: now })
      .where(eq(schema.orderConversations.id, conversationId));

    const senderName = await resolveSenderDisplayName(userId, "Store Staff");

    await db.insert(schema.orderChatMessages).values({
      conversationId,
      orgId: conversation.orgId,
      senderUserId: userId,
      senderRole: orgRole === "org:admin" ? "vendor_admin" : "vendor_member",
      senderName,
      content: "This inquiry has been marked as resolved by the store team.",
      messageType: "system",
      isRead: false,
      createdAt: now,
    });

    await publishChatEvent(conversationId, {
      type: "conversation_resolved",
      conversationId,
    });

    await logAuditAction({
      userId,
      action: "RESOLVE_ORDER_CHAT",
      targetType: "simulated_order",
      targetId: conversation.orderId,
      metadata: { conversationId },
    });

    return { success: true };
  });

/**
 * Action 7: List messages for a conversation (safe wrapper).
 */
export const listMessagesAction = authenticatedAction
  .schema(listMessagesSchema)
  .action(
    async ({ parsedInput: { conversationId, cursor, limit }, ctx: { userId, orgId, orgRole } }) => {
      await validateConversationAccess(conversationId, userId, orgId, orgRole);

      const beforeDate = cursor ? new Date(cursor) : undefined;
      const messages = await listMessages(conversationId, { limit, before: beforeDate });

      return { success: true, messages };
    },
  );
