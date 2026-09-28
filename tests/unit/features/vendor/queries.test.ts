import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock DB client
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLeftJoin = vi.fn();

vi.mock("@/shared/db/client", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

// Mock Clerk server
const mockGetOrganization = vi.fn();
const mockCreateClerkClient = vi.fn(() => ({
  organizations: {
    getOrganization: mockGetOrganization,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  createClerkClient: () => mockCreateClerkClient(),
}));

import {
  getCachedOrganization,
  getBranchCountForOrg,
  getOnlineOrderCountForVendor,
  getVendorCatalogAndStockStats,
} from "@/features/vendor/queries";

describe("features/vendor/queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({
      where: mockWhere,
      leftJoin: mockLeftJoin,
    });
    mockLeftJoin.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([]);
  });

  describe("getCachedOrganization", () => {
    it("fetches and returns mapped organization details from Clerk", async () => {
      mockGetOrganization.mockResolvedValue({
        id: "org_abc123",
        name: "Acme Artisan Goods",
        slug: "acme-artisan",
        imageUrl: "https://example.com/logo.png",
        publicMetadata: {
          phone: "+94771234567",
          description: "Handcrafted sustainable lifestyle items",
        },
        privateMetadata: {
          bankAccountNumber: "SECRET_BANK_NUM",
        },
      });

      const result = await getCachedOrganization("org_abc123");

      expect(mockCreateClerkClient).toHaveBeenCalled();
      expect(mockGetOrganization).toHaveBeenCalledWith({ organizationId: "org_abc123" });
      expect(result).toEqual({
        id: "org_abc123",
        name: "Acme Artisan Goods",
        slug: "acme-artisan",
        imageUrl: "https://example.com/logo.png",
        publicMetadata: {
          phone: "+94771234567",
          description: "Handcrafted sustainable lifestyle items",
        },
      });
      // Should omit privateMetadata
      expect(result).not.toHaveProperty("privateMetadata");
    });
  });

  describe("getBranchCountForOrg", () => {
    it("returns branch count when branches exist for the organization", async () => {
      mockWhere.mockResolvedValue([{ count: 4 }]);

      const count = await getBranchCountForOrg("org_abc123");

      expect(mockSelect).toHaveBeenCalled();
      expect(count).toBe(4);
    });

    it("returns 0 when organization has no branch records", async () => {
      mockWhere.mockResolvedValue([]);

      const count = await getBranchCountForOrg("org_abc123");

      expect(count).toBe(0);
    });

    it("returns 0 when database returns undefined row count", async () => {
      mockWhere.mockResolvedValue([{}]);

      const count = await getBranchCountForOrg("org_abc123");

      expect(count).toBe(0);
    });
  });

  describe("getOnlineOrderCountForVendor", () => {
    it("returns count of distinct orders associated with the vendor", async () => {
      mockWhere.mockResolvedValue([{ count: 18 }]);

      const count = await getOnlineOrderCountForVendor("org_abc123");

      expect(mockSelect).toHaveBeenCalled();
      expect(count).toBe(18);
    });

    it("returns 0 when no online orders exist for the vendor", async () => {
      mockWhere.mockResolvedValue([]);

      const count = await getOnlineOrderCountForVendor("org_abc123");

      expect(count).toBe(0);
    });
  });

  describe("getVendorCatalogAndStockStats", () => {
    it("aggregates item, product, service, active listing, out-of-stock, and low-stock counts", async () => {
      mockWhere.mockResolvedValue([
        {
          totalItems: 42,
          totalProducts: 35,
          totalServices: 7,
          activeListings: 40,
          outOfStockCount: 3,
          lowStockCount: 5,
        },
      ]);

      const stats = await getVendorCatalogAndStockStats("org_abc123");

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockLeftJoin).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(stats).toEqual({
        totalItems: 42,
        totalProducts: 35,
        totalServices: 7,
        activeListings: 40,
        outOfStockCount: 3,
        lowStockCount: 5,
      });
    });

    it("returns zeroes when no rows are returned from the stats query", async () => {
      mockWhere.mockResolvedValue([]);

      const stats = await getVendorCatalogAndStockStats("org_empty");

      expect(stats).toEqual({
        totalItems: 0,
        totalProducts: 0,
        totalServices: 0,
        activeListings: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
      });
    });

    it("handles partial nullish values gracefully by defaulting each to 0", async () => {
      mockWhere.mockResolvedValue([
        {
          totalItems: null,
          totalProducts: undefined,
          totalServices: 2,
          activeListings: null,
          outOfStockCount: 0,
          lowStockCount: undefined,
        },
      ]);

      const stats = await getVendorCatalogAndStockStats("org_partial");

      expect(stats).toEqual({
        totalItems: 0,
        totalProducts: 0,
        totalServices: 2,
        activeListings: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
      });
    });
  });
});
