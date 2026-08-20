import type { InferSelectModel } from "drizzle-orm";
import type * as schema from "@/shared/db/schema";
import type { ShippingQuoteMetadata } from "@/shared/db/schema/chat";

export type OrderConversationRow = InferSelectModel<typeof schema.orderConversations>;
export type OrderChatMessageRow = InferSelectModel<typeof schema.orderChatMessages>;

export type SenderRole = "customer" | "vendor_admin" | "vendor_member";
export type MessageType = "text" | "shipping_quote" | "attachment" | "system";
export type ConversationStatus = "open" | "resolved" | "archived";

export type { ShippingQuoteMetadata };

export interface ConversationDetail extends OrderConversationRow {
  orderTotalAmount?: number;
  orderCurrency?: string;
  orderStatus?: string;
  customerName?: string;
  customerEmail?: string;
  branchName?: string | null;
  itemsSummary?: string;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  orgId: string;
  senderUserId: string;
  senderRole: SenderRole;
  senderName: string;
  content: string;
  messageType: MessageType;
  metadata?: ShippingQuoteMetadata | Record<string, unknown> | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isRead: boolean;
  readAt?: Date | string | null;
  createdAt: Date | string;
}
