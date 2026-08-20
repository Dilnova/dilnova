import { z } from "zod/v3";
import { uuidField } from "@/shared/validation/primitives";

export const createConversationSchema = z.object({
  orderId: uuidField,
});

export const sendMessageSchema = z.object({
  conversationId: uuidField,
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(3000, "Message too long (max 3000 chars)."),
  messageType: z.enum(["text", "shipping_quote", "attachment", "system"]).default("text"),
  metadata: z.record(z.any()).optional(),
  attachmentUrl: z.string().url("Invalid attachment URL").max(1000).optional(),
  attachmentName: z.string().max(255).optional(),
});

export const sendShippingQuoteSchema = z.object({
  conversationId: uuidField,
  fee: z.number().int("Fee must be in cents/integer").min(0, "Fee must be positive"),
  currency: z.string().min(2).max(5).default("LKR"),
  carrier: z.string().max(100).optional(),
  zone: z.string().max(100).optional(),
  estimatedDays: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(500).optional(),
});

export const sendAttachmentSchema = z.object({
  conversationId: uuidField,
  attachmentUrl: z.string().url("Invalid attachment URL").max(1000),
  attachmentName: z.string().min(1).max(255),
  content: z.string().max(500).optional(),
});

export const markConversationReadSchema = z.object({
  conversationId: uuidField,
});

export const resolveConversationSchema = z.object({
  conversationId: uuidField,
});

export const listMessagesSchema = z.object({
  conversationId: uuidField,
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(30),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendShippingQuoteInput = z.infer<typeof sendShippingQuoteSchema>;
export type SendAttachmentInput = z.infer<typeof sendAttachmentSchema>;
export type MarkConversationReadInput = z.infer<typeof markConversationReadSchema>;
export type ResolveConversationInput = z.infer<typeof resolveConversationSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;
