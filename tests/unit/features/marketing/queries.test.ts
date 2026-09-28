import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock DB client
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/shared/db/client", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

// Mock Clerk Cache
const mockGetCachedOrganizations = vi.fn();
vi.mock("@/shared/auth/clerk-cache", () => ({
  getCachedOrganizations: () => mockGetCachedOrganizations(),
}));

// Mock logger
vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { getTrendingProducts, getFeaturedSeries } from "@/features/marketing/queries";
import { logger } from "@/shared/logging/logger";

describe("features/marketing/queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);

    mockGetCachedOrganizations.mockResolvedValue([
      { id: "org_1", name: "Green Garden Store", slug: "green-garden" },
      { id: "org_2", name: "Artisan Ceramics", slug: "artisan-ceramics" },
    ]);
  });

  describe("getTrendingProducts", () => {
    it("fetches and maps active trending products with vendor details and formatted prices", async () => {
      const mockProducts = [
        {
          id: "prod_1",
          name: "Organic Fertilizer",
          price: 2500, // 25.00
          currency: "USD",
          imageUrl: "https://example.com/fert.jpg",
          orgId: "org_1",
          createdAt: new Date(),
        },
        {
          id: "prod_2",
          name: "Ceramic Planter",
          price: 4500,
          currency: "LKR",
          imageUrl: "https://example.com/planter.jpg",
          orgId: "org_2",
          createdAt: new Date(),
        },
        {
          id: "prod_3",
          name: "Unassigned Product",
          price: 1500,
          currency: null,
          imageUrl: null,
          orgId: "org_unknown",
          createdAt: new Date(),
        },
      ];

      mockLimit.mockResolvedValueOnce(mockProducts);

      const result = await getTrendingProducts(8);

      expect(mockLimit).toHaveBeenCalledWith(8);
      expect(result).toHaveLength(3);

      expect(result[0]).toEqual({
        id: "prod_1",
        name: "Organic Fertilizer",
        price: "$25.00",
        priceInCents: 2500,
        currency: "USD",
        imageUrl: "https://example.com/fert.jpg",
        vendorName: "Green Garden Store",
        vendorSlug: "green-garden",
      });

      expect(result[1]).toEqual({
        id: "prod_2",
        name: "Ceramic Planter",
        price: "LKR\u00A045.00",
        priceInCents: 4500,
        currency: "LKR",
        imageUrl: "https://example.com/planter.jpg",
        vendorName: "Artisan Ceramics",
        vendorSlug: "artisan-ceramics",
      });

      // Handles unknown vendor and null image/currency gracefully
      expect(result[2].vendorName).toBe("Unknown Vendor");
      expect(result[2].vendorSlug).toBe("org_unknown");
      expect(result[2].imageUrl).toBe("");
      expect(result[2].currency).toBe("LKR");
    });

    it("returns empty array when no active products exist", async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await getTrendingProducts(4);

      expect(result).toEqual([]);
      expect(mockGetCachedOrganizations).not.toHaveBeenCalled();
    });

    it("catches DB query errors, logs error, and returns empty array", async () => {
      mockLimit.mockRejectedValueOnce(new Error("Database connection error"));

      const result = await getTrendingProducts();

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch trending products",
        expect.any(Error),
      );
    });
  });

  describe("getFeaturedSeries", () => {
    it("fetches active categories and pulls recent products for each series", async () => {
      const mockCategories = [
        {
          id: "cat_1",
          name: "Gardening Tools",
          localizedDescriptions: { en: "High quality gardening tools" },
          createdAt: new Date(),
        },
        {
          id: "cat_2",
          name: "Indoor Plants",
          localizedDescriptions: null,
          createdAt: new Date(),
        },
      ];

      const cat1Products = [
        {
          id: "prod_1",
          name: "Hand Trowel",
          price: 1200,
          currency: "USD",
          imageUrl: "https://example.com/trowel.jpg",
          orgId: "org_1",
        },
      ];

      const cat2Products = [
        {
          id: "prod_2",
          name: "Snake Plant",
          price: 3200,
          currency: "LKR",
          imageUrl: null,
          orgId: "org_2",
        },
      ];

      // 1st query: categories
      mockLimit.mockResolvedValueOnce(mockCategories);
      // 2nd query: cat 1 products
      mockLimit.mockResolvedValueOnce(cat1Products);
      // 3rd query: cat 2 products
      mockLimit.mockResolvedValueOnce(cat2Products);

      const series = await getFeaturedSeries();

      expect(series).toHaveLength(2);
      expect(series[0].id).toBe("cat_1");
      expect(series[0].title).toBe("Gardening Tools");
      expect(series[0].description).toBe("High quality gardening tools");
      expect(series[0].products).toHaveLength(1);
      expect(series[0].products[0].name).toBe("Hand Trowel");
      expect(series[0].products[0].vendorName).toBe("Green Garden Store");

      expect(series[1].id).toBe("cat_2");
      expect(series[1].title).toBe("Indoor Plants");
      expect(series[1].description).toBe("Explore products in Indoor Plants.");
      expect(series[1].products[0].name).toBe("Snake Plant");
    });

    it("filters out categories that have no products", async () => {
      const mockCategories = [
        { id: "cat_1", name: "Has Products", localizedDescriptions: { en: "Desc" } },
        { id: "cat_2", name: "Empty Category", localizedDescriptions: { en: "Desc" } },
      ];

      mockLimit.mockResolvedValueOnce(mockCategories);
      mockLimit.mockResolvedValueOnce([{ id: "p1", name: "Item", price: 1000, orgId: "org_1" }]);
      mockLimit.mockResolvedValueOnce([]); // Empty

      const series = await getFeaturedSeries();

      expect(series).toHaveLength(1);
      expect(series[0].id).toBe("cat_1");
    });

    it("returns empty array when no active categories exist", async () => {
      mockLimit.mockResolvedValueOnce([]);

      const series = await getFeaturedSeries();

      expect(series).toEqual([]);
      expect(mockGetCachedOrganizations).not.toHaveBeenCalled();
    });

    it("catches errors, logs error, and returns empty array", async () => {
      mockLimit.mockRejectedValueOnce(new Error("Network timeout"));

      const series = await getFeaturedSeries();

      expect(series).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch featured series",
        expect.any(Error),
      );
    });
  });
});
