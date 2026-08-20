import "server-only";

import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and, desc, asc, inArray, sql, lt } from "drizzle-orm";
import type { ConversationDetail, ChatMessageItem, OrderConversationRow } from "./types";

/**
 * Fetch a conversation by order ID for a specific customer.
 */
export async function getConversationByOrder(
  orderId: string,
  customerUserId: string,
): Promise<OrderConversationRow | null> {
  const rows = await db
    .select()
    .from(schema.orderConversations)
    .where(
      and(
        eq(schema.orderConversations.orderId, orderId),
        eq(schema.orderConversations.customerUserId, customerUserId),
      ),
    )
    .limit(1);

  return rows[0] || null;
}

/**
 * Fetch conversation details with related order and branch metadata.
 */
export async function getConversationDetailById(
  conversationId: string,
): Promise<ConversationDetail | null> {
  const rows = await db
    .select({
      conversation: schema.orderConversations,
      order: {
        id: schema.simulatedOrders.id,
        totalAmount: schema.simulatedOrders.totalAmount,
        presentmentCurrency: schema.simulatedOrders.presentmentCurrency,
        vendorBaseCurrency: schema.simulatedOrders.vendorBaseCurrency,
        status: schema.simulatedOrders.status,
        customerName: schema.simulatedOrders.customerName,
        customerEmail: schema.simulatedOrders.customerEmail,
        pickupBranchId: schema.simulatedOrders.pickupBranchId,
      },
      branchName: schema.branches.name,
    })
    .from(schema.orderConversations)
    .innerJoin(
      schema.simulatedOrders,
      eq(schema.orderConversations.orderId, schema.simulatedOrders.id),
    )
    .leftJoin(schema.branches, eq(schema.orderConversations.branchId, schema.branches.id))
    .where(eq(schema.orderConversations.id, conversationId))
    .limit(1);

  if (rows.length === 0) return null;

  const { conversation, order, branchName } = rows[0];

  return {
    ...conversation,
    orderTotalAmount: order.totalAmount,
    orderCurrency: order.presentmentCurrency || order.vendorBaseCurrency || "LKR",
    orderStatus: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    branchName: branchName || null,
  };
}

/**
 * List conversations for an organization with strict multi-tenant & branch scoping.
 * - org:admin sees all conversations for their org.
 * - org:member sees only conversations belonging to their assigned branches.
 */
export async function listOrgConversations(
  orgId: string,
  options: {
    userId: string;
    orgRole: string;
    status?: string;
    branchId?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ conversations: ConversationDetail[]; totalCount: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  // Determine permitted branch IDs for org:member
  let permittedBranchIds: string[] | null = null;

  if (options.orgRole === "org:member") {
    // Look up branches where this member is assigned
    const memberBranches = await db
      .select({ branchId: schema.branchMembers.branchId })
      .from(schema.branchMembers)
      .innerJoin(schema.branches, eq(schema.branchMembers.branchId, schema.branches.id))
      .where(
        and(
          eq(schema.branches.orgId, orgId),
          eq(schema.branchMembers.memberUserId, options.userId),
        ),
      );

    permittedBranchIds = memberBranches.map((b) => b.branchId);

    // If an org:member is not assigned to any branch, they see 0 conversations
    if (permittedBranchIds.length === 0) {
      return { conversations: [], totalCount: 0 };
    }
  }

  // Construct filters
  const conditions = [eq(schema.orderConversations.orgId, orgId)];

  if (options.status) {
    conditions.push(eq(schema.orderConversations.status, options.status));
  }

  if (options.branchId) {
    if (permittedBranchIds && !permittedBranchIds.includes(options.branchId)) {
      return { conversations: [], totalCount: 0 };
    }
    conditions.push(eq(schema.orderConversations.branchId, options.branchId));
  } else if (permittedBranchIds) {
    conditions.push(inArray(schema.orderConversations.branchId, permittedBranchIds));
  }

  const whereClause = and(...conditions);

  const [totalRows, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orderConversations)
      .where(whereClause),
    db
      .select({
        conversation: schema.orderConversations,
        order: {
          id: schema.simulatedOrders.id,
          totalAmount: schema.simulatedOrders.totalAmount,
          presentmentCurrency: schema.simulatedOrders.presentmentCurrency,
          vendorBaseCurrency: schema.simulatedOrders.vendorBaseCurrency,
          status: schema.simulatedOrders.status,
          customerName: schema.simulatedOrders.customerName,
          customerEmail: schema.simulatedOrders.customerEmail,
        },
        branchName: schema.branches.name,
      })
      .from(schema.orderConversations)
      .innerJoin(
        schema.simulatedOrders,
        eq(schema.orderConversations.orderId, schema.simulatedOrders.id),
      )
      .leftJoin(schema.branches, eq(schema.orderConversations.branchId, schema.branches.id))
      .where(whereClause)
      .orderBy(desc(schema.orderConversations.lastMessageAt))
      .limit(limit)
      .offset(offset),
  ]);

  const conversations: ConversationDetail[] = rows.map(({ conversation, order, branchName }) => ({
    ...conversation,
    orderTotalAmount: order.totalAmount,
    orderCurrency: order.presentmentCurrency || order.vendorBaseCurrency || "LKR",
    orderStatus: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    branchName: branchName || null,
  }));

  return {
    conversations,
    totalCount: Number(totalRows[0]?.count || 0),
  };
}

/**
 * List conversations for a customer.
 */
export async function listCustomerConversations(
  customerUserId: string,
): Promise<ConversationDetail[]> {
  const rows = await db
    .select({
      conversation: schema.orderConversations,
      order: {
        id: schema.simulatedOrders.id,
        totalAmount: schema.simulatedOrders.totalAmount,
        presentmentCurrency: schema.simulatedOrders.presentmentCurrency,
        vendorBaseCurrency: schema.simulatedOrders.vendorBaseCurrency,
        status: schema.simulatedOrders.status,
        customerName: schema.simulatedOrders.customerName,
        customerEmail: schema.simulatedOrders.customerEmail,
      },
      branchName: schema.branches.name,
    })
    .from(schema.orderConversations)
    .innerJoin(
      schema.simulatedOrders,
      eq(schema.orderConversations.orderId, schema.simulatedOrders.id),
    )
    .leftJoin(schema.branches, eq(schema.orderConversations.branchId, schema.branches.id))
    .where(eq(schema.orderConversations.customerUserId, customerUserId))
    .orderBy(desc(schema.orderConversations.lastMessageAt));

  return rows.map(({ conversation, order, branchName }) => ({
    ...conversation,
    orderTotalAmount: order.totalAmount,
    orderCurrency: order.presentmentCurrency || order.vendorBaseCurrency || "LKR",
    orderStatus: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    branchName: branchName || null,
  }));
}

/**
 * List paginated chat messages for a conversation.
 */
export async function listMessages(
  conversationId: string,
  options?: { limit?: number; before?: Date },
): Promise<ChatMessageItem[]> {
  const limit = options?.limit || 50;

  const conditions = [eq(schema.orderChatMessages.conversationId, conversationId)];
  if (options?.before) {
    conditions.push(lt(schema.orderChatMessages.createdAt, options.before));
  }

  const rows = await db
    .select()
    .from(schema.orderChatMessages)
    .where(and(...conditions))
    .orderBy(asc(schema.orderChatMessages.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    orgId: r.orgId,
    senderUserId: r.senderUserId,
    senderRole: r.senderRole as ChatMessageItem["senderRole"],
    senderName: r.senderName,
    content: r.content,
    messageType: r.messageType as ChatMessageItem["messageType"],
    metadata: r.metadata as ChatMessageItem["metadata"],
    attachmentUrl: r.attachmentUrl,
    attachmentName: r.attachmentName,
    isRead: r.isRead,
    readAt: r.readAt,
    createdAt: r.createdAt,
  }));
}

/**
 * Get total unread messages count for an organization (scoped to member branches if applicable).
 */
export async function getOrgUnreadTotal(
  orgId: string,
  options: { userId: string; orgRole: string },
): Promise<number> {
  let permittedBranchIds: string[] | null = null;

  if (options.orgRole === "org:member") {
    const memberBranches = await db
      .select({ branchId: schema.branchMembers.branchId })
      .from(schema.branchMembers)
      .innerJoin(schema.branches, eq(schema.branchMembers.branchId, schema.branches.id))
      .where(
        and(
          eq(schema.branches.orgId, orgId),
          eq(schema.branchMembers.memberUserId, options.userId),
        ),
      );

    permittedBranchIds = memberBranches.map((b) => b.branchId);
    if (permittedBranchIds.length === 0) return 0;
  }

  const conditions = [
    eq(schema.orderConversations.orgId, orgId),
    eq(schema.orderConversations.status, "open"),
  ];

  if (permittedBranchIds) {
    conditions.push(inArray(schema.orderConversations.branchId, permittedBranchIds));
  }

  const result = await db
    .select({
      totalUnread: sql<number>`COALESCE(SUM(${schema.orderConversations.unreadByVendor}), 0)`,
    })
    .from(schema.orderConversations)
    .where(and(...conditions));

  return Number(result[0]?.totalUnread || 0);
}
