import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateSocialShareUrls } from "@/features/social-share/services/whatsapp-share";
import {
  postProductToFacebookPageFeed,
  testFacebookPageConnection,
} from "@/features/social-share/services/facebook-feed";
import {
  postProductToInstagramFeed,
  testInstagramConnection,
} from "@/features/social-share/services/instagram-feed";
import { dispatchProductWebhook } from "@/features/social-share/services/webhook-dispatcher";
import {
  saveSocialSettingsSchema,
  testFacebookPagePostSchema,
  testInstagramPostSchema,
  testWebhookSchema,
  manualPublishProductSchema,
} from "@/features/social-share/schema";

describe("Multi-Channel Social Publishing Suite", () => {
  describe("WhatsApp & Multi-Channel 1-Click Link Generator", () => {
    it("generates correctly formatted 1-Click WhatsApp, Facebook, Telegram, and Instagram links", () => {
      const product = {
        id: "prod-12345",
        name: "Handmade Ceramic Vase",
        description: "Elegant artisanal ceramic vase.",
        price: 4500, // 45.00
        imageUrl: "https://res.cloudinary.com/demo/image/upload/vase.jpg",
      };

      const links = generateSocialShareUrls({
        product,
        currency: "LKR",
        storeUrl: "https://dilnova.com",
        brandName: "Artisan Crafts",
      });

      // 1. WhatsApp URL contains encoded product details & direct checkout link
      expect(links.whatsappUrl).toContain("https://wa.me/?text=");
      const decodedWa = decodeURIComponent(links.whatsappUrl);
      expect(decodedWa).toContain("Handmade Ceramic Vase");
      expect(decodedWa).toContain("LKR 45.00");
      expect(decodedWa).toContain("https://dilnova.com/products/prod-12345");

      // 2. Facebook Share Dialog
      expect(links.facebookShareUrl).toContain("https://www.facebook.com/sharer/sharer.php?u=");
      expect(links.facebookShareUrl).toContain(
        encodeURIComponent("https://dilnova.com/products/prod-12345"),
      );

      // 3. Telegram Share Link
      expect(links.telegramShareUrl).toContain("https://t.me/share/url");
      expect(links.telegramShareUrl).toContain("prod-12345");

      // 4. Instagram Caption includes formatted price and hashtags
      expect(links.instagramCaption).toContain("Handmade Ceramic Vase");
      expect(links.instagramCaption).toContain("LKR 45.00");
      expect(links.instagramCaption).toContain("#artisancrafts");
    });
  });

  describe("Facebook Page Feed Auto-Posting", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("publishes a photo post when product has an imageUrl", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "photo_post_999",
          post_id: "page_123_post_999",
        }),
      });

      const res = await postProductToFacebookPageFeed({
        pageId: "123456789",
        pageAccessToken: "EAA_test_page_token",
        product: {
          id: "prod-1",
          name: "Leather Wallet",
          price: 3500,
          imageUrl: "https://example.com/wallet.jpg",
          description: "Genuine leather wallet",
        },
        currency: "USD",
        brandName: "Acme",
      });

      expect(res.success).toBe(true);
      expect(res.postId).toBe("page_123_post_999");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/123456789/photos"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("renders custom templates with dynamic tag replacements", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "post_100" }),
      });

      await postProductToFacebookPageFeed({
        pageId: "123456789",
        pageAccessToken: "EAA_test_page_token",
        product: {
          id: "prod-1",
          name: "Silk Scarf",
          price: 1500,
          imageUrl: "https://example.com/scarf.jpg",
        },
        currency: "EUR",
        storeUrl: "https://dilnova.com",
        customTemplate: "FLASH SALE: {title} now only {price}! Order: {link}",
      });

      const fetchCallBody = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(fetchCallBody.caption).toContain("FLASH SALE: Silk Scarf now only EUR 15.00!");
      expect(fetchCallBody.caption).toContain("https://dilnova.com/products/prod-1");
    });

    it("gracefully skips posting when product has no image/media uploaded", async () => {
      const res = await postProductToFacebookPageFeed({
        pageId: "123456789",
        pageAccessToken: "EAA_test_page_token",
        product: {
          id: "prod-no-img",
          name: "Item Without Photo",
          price: 1000,
          imageUrl: null,
        },
        currency: "LKR",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("no image or media");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("verifies Facebook Page connection", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "123456789",
          name: "My Official Shop Page",
        }),
      });

      const res = await testFacebookPageConnection({
        pageId: "123456789",
        pageAccessToken: "valid_token",
      });

      expect(res.valid).toBe(true);
      expect(res.pageName).toBe("My Official Shop Page");
    });
  });

  describe("Instagram Feed Auto-Posting", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("executes 2-step media container and media_publish flow", async () => {
      // Step 1: Media Container
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "creation_id_111" }),
      });
      // Step 2: Media Publish
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "ig_media_222" }),
      });

      const res = await postProductToInstagramFeed({
        igAccountId: "987654321",
        accessToken: "valid_ig_token",
        product: {
          id: "prod-ig",
          name: "Organic Honey",
          price: 1800,
          imageUrl: "https://example.com/honey.jpg",
        },
      });

      expect(res.success).toBe(true);
      expect(res.mediaId).toBe("ig_media_222");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("rejects publishing if product lacks an image", async () => {
      const res = await postProductToInstagramFeed({
        igAccountId: "987654321",
        accessToken: "valid_ig_token",
        product: {
          id: "prod-no-img",
          name: "Consulting Service",
          price: 5000,
        },
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("requires a product image URL");
    });
    it("verifies Instagram account connection", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "987654321",
          username: "artisan_crafts_official",
        }),
      });

      const res = await testInstagramConnection({
        igAccountId: "987654321",
        accessToken: "valid_token",
      });

      expect(res.valid).toBe(true);
      expect(res.username).toBe("artisan_crafts_official");
    });
  });

  describe("Outbound Webhooks", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("dispatches product event payload to webhook endpoint", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const res = await dispatchProductWebhook({
        webhookUrl: "https://hooks.zapier.com/hooks/catch/123/456",
        event: "product.created",
        orgId: "org-1",
        product: {
          id: "p1",
          name: "Item",
          price: 1000,
        },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://hooks.zapier.com/hooks/catch/123/456",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      );
    });
  });

  describe("Zod Validation Schemas", () => {
    it("validates multi-channel social settings", () => {
      const valid = saveSocialSettingsSchema.safeParse({
        facebookPageId: "123456",
        facebookPageAccessToken: "token",
        instagramAccountId: "987654",
        webhookUrl: "https://hooks.zapier.com/test",
        isEnabled: true,
        autoPostFacebookFeed: true,
        autoPostInstagramFeed: false,
        autoSyncMetaCatalog: true,
        autoTriggerWebhook: true,
      });

      expect(valid.success).toBe(true);
    });

    it("validates test connection schemas", () => {
      expect(
        testFacebookPagePostSchema.safeParse({
          facebookPageId: "123",
          facebookPageAccessToken: "tok",
        }).success,
      ).toBe(true);

      expect(
        testInstagramPostSchema.safeParse({
          instagramAccountId: "456",
          accessToken: "tok",
        }).success,
      ).toBe(true);

      expect(
        testWebhookSchema.safeParse({
          webhookUrl: "https://example.com/hook",
        }).success,
      ).toBe(true);
    });

    it("validates manual publish schema", () => {
      const valid = manualPublishProductSchema.safeParse({
        productId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        channels: ["facebook_feed", "meta_catalog"],
      });

      expect(valid.success).toBe(true);
    });
  });
});
