import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  index,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { simulatedOrders } from "./orders";
import { branches } from "./billing";
import { encryptedText } from "./custom-types";

export interface ShippingQuoteMetadata {
  fee: number;
  currency: string;
  carrier?: string;
  zone?: string;
  estimatedDays?: number;
  notes?: string;
}

export const orderConversations = pgTable(
  "order_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => simulatedOrders.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    customerUserId: text("customer_user_id").notNull(),
    status: text("status").default("open").notNull(), // 'open' | 'resolved' | 'archived'
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    unreadByCustomer: integer("unread_by_customer").default(0).notNull(),
    unreadByVendor: integer("unread_by_vendor").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_order_conversations_org_id").on(t.orgId),
    index("idx_order_conversations_order_id").on(t.orderId),
    index("idx_order_conversations_branch_id").on(t.branchId),
    index("idx_order_conversations_customer_user_id").on(t.customerUserId),
    index("idx_order_conversations_status").on(t.status),
    index("idx_order_conversations_last_message_at").on(t.lastMessageAt),
  ],
);

export const orderChatMessages = pgTable(
  "order_chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => orderConversations.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    senderUserId: text("sender_user_id").notNull(),
    senderRole: text("sender_role").notNull(), // 'customer' | 'vendor_admin' | 'vendor_member'
    senderName: encryptedText("sender_name").notNull(),
    content: text("content").notNull(),
    messageType: text("message_type").default("text").notNull(), // 'text' | 'shipping_quote' | 'attachment' | 'system'
    metadata: jsonb("metadata").$type<ShippingQuoteMetadata | Record<string, unknown>>(),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_order_chat_messages_conversation_id").on(t.conversationId),
    index("idx_order_chat_messages_org_id").on(t.orgId),
    index("idx_order_chat_messages_sender_user_id").on(t.senderUserId),
    index("idx_order_chat_messages_created_at").on(t.createdAt),
  ],
);
