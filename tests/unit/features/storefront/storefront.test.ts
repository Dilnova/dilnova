import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock DB client
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockLeftJoin = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/shared/db/client", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

// Mock logger
vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock platform settings for getStockAvailabilityCatalog
vi.mock("@/shared/platform/settings", () => ({
  getSystemSetting: vi.fn().mockResolvedValue(""),
}));

import { getVendorProducts } from "@/features/storefront/get-vendor-products";
import { enrichVendorProductsWithPurchaseFlags } from "@/features/storefront/purchase";
import type { VendorProduct } from "@/features/storefront/components/custom/types";

describe("features/storefront", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({
      leftJoin: mockLeftJoin,
      where: mockWhere,
    });
    mockLeftJoin.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([]);
  });

  describe("getVendorProducts", () => {
    it("fetches active products for the given vendor orgId with category details", async () => {
      const mockDbProducts = [
        {
          id: "prod_1",
          name: "Ceramic Bowl",
          type: "product",
          description: "Handcrafted bowl",
          price: 2500,
          imageUrl: "https://example.com/bowl.jpg",
          categoryName: "Kitchenware",
          categorySlug: "kitchenware",
        },
        {
          id: "prod_2",
          name: "Pottery Workshop",
          type: "service",
          description: "1-hour pottery class",
          price: 6000,
          imageUrl: "https://example.com/class.jpg",
          categoryName: "Experiences",
          categorySlug: "experiences",
        },
      ];

      mockWhere.mockResolvedValueOnce(mockDbProducts);

      const products = await getVendorProducts("org_vendor_1");

      expect(products).toHaveLength(2);
      expect(products[0].name).toBe("Ceramic Bowl");
      expect(products[0].type).toBe("product");
      expect(products[0].categoryName).toBe("Kitchenware");

      expect(products[1].name).toBe("Pottery Workshop");
      expect(products[1].type).toBe("service");
      expect(products[1].categorySlug).toBe("experiences");
    });

    it("returns empty array if vendor has no active products", async () => {
      mockWhere.mockResolvedValueOnce([]);

      const products = await getVendorProducts("org_vendor_empty");

      expect(products).toEqual([]);
    });
  });

  describe("enrichVendorProductsWithPurchaseFlags", () => {
    it("returns empty array immediately when passed empty products list", async () => {
      const result = await enrichVendorProductsWithPurchaseFlags([]);
      expect(result).toEqual([]);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("sets canPurchase = true for services without querying inventory", async () => {
      const serviceItem: VendorProduct = {
        id: "srv_1",
        name: "Consultation Service",
        type: "service",
        price: 5000,
      };

      const enriched = await enrichVendorProductsWithPurchaseFlags([serviceItem]);

      expect(enriched).toHaveLength(1);
      expect(enriched[0].id).toBe("srv_1");
      expect(enriched[0].canPurchase).toBe(true);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("enriches physical products by joining inventory availability", async () => {
      const vendorProducts: VendorProduct[] = [
        {
          id: "prod_in_stock",
          name: "In Stock T-Shirt",
          type: "product",
          price: 2000,
        },
        {
          id: "prod_out_of_stock",
          name: "Sold Out Mug",
          type: "product",
          price: 1500,
        },
        {
          id: "prod_preorder",
          name: "Pre-order Book",
          type: "product",
          price: 3000,
        },
        {
          id: "prod_missing_inv",
          name: "Ghost Item",
          type: "product",
          price: 1000,
        },
      ];

      const mockInventoryRows = [
        {
          productId: "prod_in_stock",
          stockAvailability: "in_stock",
          quantity: 10,
        },
        {
          productId: "prod_out_of_stock",
          stockAvailability: "out_of_stock",
          quantity: 0,
        },
        {
          productId: "prod_preorder",
          stockAvailability: "pre_order",
          quantity: 0,
        },
      ];

      mockWhere.mockResolvedValueOnce(mockInventoryRows);

      const enriched = await enrichVendorProductsWithPurchaseFlags(vendorProducts);

      expect(enriched).toHaveLength(4);

      // In-stock product can be purchased
      const inStock = enriched.find((p) => p.id === "prod_in_stock");
      expect(inStock?.canPurchase).toBe(true);

      // Out-of-stock product cannot be purchased
      const outOfStock = enriched.find((p) => p.id === "prod_out_of_stock");
      expect(outOfStock?.canPurchase).toBe(false);

      // Pre-order product can be purchased
      const preOrder = enriched.find((p) => p.id === "prod_preorder");
      expect(preOrder?.canPurchase).toBe(true);

      // Missing inventory record falls back to unpurchasable for product type
      const missingInv = enriched.find((p) => p.id === "prod_missing_inv");
      expect(missingInv?.canPurchase).toBe(false);
    });

    it("handles mixed list of services and physical products correctly", async () => {
      const items: VendorProduct[] = [
        {
          id: "serv_1",
          name: "Design Workshop",
          type: "service",
          price: 8000,
        },
        {
          id: "prod_1",
          name: "Design Pen",
          type: "product",
          price: 500,
        },
      ];

      mockWhere.mockResolvedValueOnce([
        {
          productId: "prod_1",
          stockAvailability: "in_stock",
          quantity: 5,
        },
      ]);

      const enriched = await enrichVendorProductsWithPurchaseFlags(items);

      expect(enriched).toHaveLength(2);
      expect(enriched[0].id).toBe("serv_1");
      expect(enriched[0].canPurchase).toBe(true);
      expect(enriched[1].id).toBe("prod_1");
      expect(enriched[1].canPurchase).toBe(true);
    });
  });
});
