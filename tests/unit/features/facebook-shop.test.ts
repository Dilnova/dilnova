import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  formatDilnovaProductForMeta,
  chunkArray,
  testCatalogConnection,
  sendMetaItemsBatch,
  checkBatchStatus,
} from "@/features/facebook-shop/services/meta-api";
import {
  saveFacebookShopSettingsSchema,
  testFacebookShopConnectionSchema,
  triggerBatchSyncSchema,
} from "@/features/facebook-shop/schema";

describe("Facebook Shop (Meta Commerce Catalog) Integration", () => {
  describe("formatDilnovaProductForMeta", () => {
    it("correctly maps a standard in-stock product into Meta specification", () => {
      const product = {
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        name: "Handcrafted Ceramic Mug",
        description: "Artisan ceramic mug made with organic clay.",
        price: 2500, // $25.00
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/mug.jpg",
        media: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/mug.jpg",
            type: "image" as const,
          },
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/mug-side.jpg",
            type: "image" as const,
          },
        ],
        isPreorder: false,
        status: "active",
      };

      const result = formatDilnovaProductForMeta({
        product,
        quantity: 15,
        currency: "USD",
        storeBaseUrl: "https://dilnova.com",
        brandName: "Artisan Studio",
      });

      expect(result).toEqual({
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        title: "Handcrafted Ceramic Mug",
        description: "Artisan ceramic mug made with organic clay.",
        availability: "in stock",
        condition: "new",
        price: "25.00 USD",
        link: "https://dilnova.com/products/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        image_link: "https://res.cloudinary.com/demo/image/upload/v1/mug.jpg",
        brand: "Artisan Studio",
        additional_image_cdn_urls: ["https://res.cloudinary.com/demo/image/upload/v1/mug-side.jpg"],
      });
    });

    it("marks out-of-stock items when quantity is 0 or status is out_of_stock", () => {
      const product = {
        id: "prod-out-of-stock",
        name: "Vintage Lamp",
        description: "Antique desk lamp",
        price: 15000,
        imageUrl: "https://example.com/lamp.jpg",
        isPreorder: false,
        status: "out_of_stock",
      };

      const result = formatDilnovaProductForMeta({
        product,
        quantity: 0,
        currency: "LKR",
      });

      expect(result.availability).toBe("out of stock");
      expect(result.price).toBe("150.00 LKR");
    });

    it("marks preorder items correctly", () => {
      const product = {
        id: "prod-preorder",
        name: "Next-Gen Smart Watch",
        description: "Pre-order now",
        price: 39900,
        imageUrl: "https://example.com/watch.jpg",
        isPreorder: true,
        status: "active",
      };

      const result = formatDilnovaProductForMeta({
        product,
        quantity: 0,
        currency: "USD",
      });

      expect(result.availability).toBe("preorder");
      expect(result.price).toBe("399.00 USD");
    });

    it("handles missing description gracefully and defaults to product title", () => {
      const product = {
        id: "prod-no-desc",
        name: "Simple T-Shirt",
        price: 2000,
      };

      const result = formatDilnovaProductForMeta({ product });
      expect(result.description).toBe("Simple T-Shirt");
      expect(result.brand).toBe("Dilnova Store");
    });
  });

  describe("chunkArray", () => {
    it("chunks large product arrays into batches respecting max size", () => {
      const items = Array.from({ length: 7500 }, (_, i) => ({ id: `prod-${i}` }));
      const chunks = chunkArray(items, 3000);

      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(3000);
      expect(chunks[1].length).toBe(3000);
      expect(chunks[2].length).toBe(1500);
    });

    it("returns single chunk when items count is less than batch size", () => {
      const items = [{ id: "1" }, { id: "2" }];
      const chunks = chunkArray(items, 3000);

      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBe(2);
    });

    it("returns empty array for empty items", () => {
      const chunks = chunkArray([], 3000);
      expect(chunks).toEqual([]);
    });
  });

  describe("Validation Schemas", () => {
    it("validates valid Facebook Shop settings", () => {
      const valid = saveFacebookShopSettingsSchema.safeParse({
        catalogId: "123456789012345",
        accessToken: "EAABsampletoken123",
        brandName: "My Shop",
        isEnabled: true,
        autoSyncOnCreate: true,
        autoSyncOnUpdate: true,
        autoSyncOnDelete: true,
      });

      expect(valid.success).toBe(true);
    });

    it("rejects empty catalogId or accessToken", () => {
      const invalid = saveFacebookShopSettingsSchema.safeParse({
        catalogId: "",
        accessToken: "",
      });

      expect(invalid.success).toBe(false);
    });

    it("validates test connection schema", () => {
      expect(
        testFacebookShopConnectionSchema.safeParse({
          catalogId: "123456",
          accessToken: "token123",
        }).success,
      ).toBe(true);

      expect(
        testFacebookShopConnectionSchema.safeParse({
          catalogId: "",
          accessToken: "",
        }).success,
      ).toBe(false);
    });

    it("validates trigger batch sync schema", () => {
      expect(triggerBatchSyncSchema.safeParse({}).success).toBe(true);
      expect(triggerBatchSyncSchema.safeParse({ forceAll: true }).success).toBe(true);
    });
  });

  describe("Meta API Client Calls", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("testCatalogConnection returns valid on successful Meta response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "123456",
          name: "Main Commerce Catalog",
          business: { id: "biz-789" },
        }),
      });

      const res = await testCatalogConnection({
        catalogId: "123456",
        accessToken: "valid-token",
      });

      expect(res.valid).toBe(true);
      expect(res.catalogName).toBe("Main Commerce Catalog");
      expect(res.businessId).toBe("biz-789");
    });

    it("testCatalogConnection returns error message on invalid token", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "Invalid OAuth access token.",
            type: "OAuthException",
            code: 190,
          },
        }),
      });

      const res = await testCatalogConnection({
        catalogId: "123456",
        accessToken: "invalid-token",
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("Invalid OAuth access token.");
    });

    it("sendMetaItemsBatch returns handles on successful batch request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          handles: ["batch-handle-xyz-123"],
        }),
      });

      const res = await sendMetaItemsBatch({
        catalogId: "123456",
        accessToken: "valid-token",
        payload: {
          item_type: "PRODUCT_ITEM",
          requests: [
            {
              method: "CREATE",
              data: {
                id: "prod-1",
                title: "Test Product",
                availability: "in stock",
                condition: "new",
                price: "10.00 USD",
                link: "https://example.com/1",
                image_link: "https://example.com/1.jpg",
                brand: "Brand",
              },
            },
          ],
        },
      });

      expect(res.handles).toEqual(["batch-handle-xyz-123"]);
      expect(res.error).toBeUndefined();
    });

    it("checkBatchStatus polls Meta async batch status correctly", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "batch-handle-xyz-123",
          status: "COMPLETED",
          errors_total_count: 0,
        }),
      });

      const res = await checkBatchStatus({
        catalogId: "123456",
        accessToken: "valid-token",
        handle: "batch-handle-xyz-123",
      });

      expect(res.status).toBe("COMPLETED");
      expect(res.errors_total_count).toBe(0);
    });
  });
});
