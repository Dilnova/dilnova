import { describe, expect, it } from "vitest";
import {
  createConversationSchema,
  sendMessageSchema,
  sendShippingQuoteSchema,
  sendAttachmentSchema,
  markConversationReadSchema,
  resolveConversationSchema,
} from "@/features/chat/schema";

describe("Chat Validation Schemas", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  describe("createConversationSchema", () => {
    it("accepts valid UUID orderId", () => {
      const res = createConversationSchema.safeParse({ orderId: validUuid });
      expect(res.success).toBe(true);
    });

    it("rejects non-UUID orderId", () => {
      const res = createConversationSchema.safeParse({ orderId: "invalid-id" });
      expect(res.success).toBe(false);
    });
  });

  describe("sendMessageSchema", () => {
    it("accepts valid text message", () => {
      const res = sendMessageSchema.safeParse({
        conversationId: validUuid,
        content: "When will this item be delivered?",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.messageType).toBe("text");
      }
    });

    it("rejects empty message content", () => {
      const res = sendMessageSchema.safeParse({
        conversationId: validUuid,
        content: "   ",
      });
      expect(res.success).toBe(false);
    });

    it("rejects message content exceeding max length", () => {
      const res = sendMessageSchema.safeParse({
        conversationId: validUuid,
        content: "a".repeat(3001),
      });
      expect(res.success).toBe(false);
    });
  });

  describe("sendShippingQuoteSchema", () => {
    it("accepts structured shipping quote", () => {
      const res = sendShippingQuoteSchema.safeParse({
        conversationId: validUuid,
        fee: 75000, // 750.00 in cents
        currency: "LKR",
        carrier: "PromptX Express",
        zone: "Western Province",
        estimatedDays: 2,
        notes: "Same day dispatch available",
      });
      expect(res.success).toBe(true);
    });

    it("rejects negative shipping fees", () => {
      const res = sendShippingQuoteSchema.safeParse({
        conversationId: validUuid,
        fee: -100,
        currency: "LKR",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("sendAttachmentSchema", () => {
    it("accepts valid Cloudinary attachment URL", () => {
      const res = sendAttachmentSchema.safeParse({
        conversationId: validUuid,
        attachmentUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        attachmentName: "receipt.jpg",
      });
      expect(res.success).toBe(true);
    });

    it("rejects non-URL attachmentUrl", () => {
      const res = sendAttachmentSchema.safeParse({
        conversationId: validUuid,
        attachmentUrl: "not-a-url",
        attachmentName: "sample.jpg",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("markConversationReadSchema & resolveConversationSchema", () => {
    it("validates conversationId format", () => {
      expect(markConversationReadSchema.safeParse({ conversationId: validUuid }).success).toBe(
        true,
      );
      expect(resolveConversationSchema.safeParse({ conversationId: validUuid }).success).toBe(true);
      expect(markConversationReadSchema.safeParse({ conversationId: "bad" }).success).toBe(false);
    });
  });
});
