import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock DB client
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockLeftJoin = vi.fn();

vi.mock("@/shared/db/client", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  getUserWishlist,
  getUserWishlistCount,
  getWishlistProducts,
} from "@/features/customer/queries";
import { logger } from "@/shared/logging/logger";

describe("features/customer/queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default fluent query builder chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({
      where: mockWhere,
      leftJoin: mockLeftJoin,
    });
    mockLeftJoin.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({
      orderBy: mockOrderBy,
      limit: mockLimit,
    });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOffset.mockResolvedValue([]);
  });

  describe("getUserWishlist", () => {
    it("returns empty array immediately if userId is empty, null, or undefined", async () => {
      expect(await getUserWishlist("")).toEqual([]);
      expect(await getUserWishlist(null)).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await getUserWishlist(undefined as any)).toEqual([]);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("applies default limit (100) and offset (0) with descending createdAt ordering", async () => {
      const mockRows = [{ id: "w_1", userId: "user_1", productId: "prod_1" }];
      mockOffset.mockResolvedValueOnce(mockRows);

      const result = await getUserWishlist("user_1");

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(100);
      expect(mockOffset).toHaveBeenCalledWith(0);
      expect(result).toEqual(mockRows);
    });

    it("clamps limit between 1 and 200 and offset >= 0", async () => {
      mockOffset.mockResolvedValueOnce([]);

      // Test upper clamp: limit 500 -> 200
      await getUserWishlist("user_1", 500, -10);
      expect(mockLimit).toHaveBeenCalledWith(200);
      expect(mockOffset).toHaveBeenCalledWith(0);

      // Test lower clamp: limit -5 -> 1
      await getUserWishlist("user_1", -5, 20);
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(mockOffset).toHaveBeenCalledWith(20);
    });

    it("catches DB exceptions and returns [] without throwing", async () => {
      mockOffset.mockRejectedValueOnce(new Error("DB connection failure"));

      const result = await getUserWishlist("user_1");
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch user wishlist",
        expect.any(Error),
        { userId: "user_1" },
      );
    });
  });

  describe("getUserWishlistCount", () => {
    it("returns 0 immediately if userId is missing", async () => {
      expect(await getUserWishlistCount("")).toBe(0);
      expect(await getUserWishlistCount(null)).toBe(0);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("queries count(*) and returns integer count", async () => {
      mockWhere.mockResolvedValueOnce([{ count: 42 }]);

      const count = await getUserWishlistCount("user_123");
      expect(count).toBe(42);
      expect(mockSelect).toHaveBeenCalled();
    });

    it("falls back to 0 if countResult is missing or DB errors", async () => {
      mockWhere.mockResolvedValueOnce([]);
      expect(await getUserWishlistCount("user_123")).toBe(0);

      mockWhere.mockRejectedValueOnce(new Error("Timeout"));
      const result = await getUserWishlistCount("user_123");
      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to count user wishlist",
        expect.any(Error),
        { userId: "user_123" },
      );
    });
  });

  describe("getWishlistProducts", () => {
    it("returns empty array immediately if productIds is empty", async () => {
      expect(await getWishlistProducts([])).toEqual([]);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("slices input array to at most 200 items and applies limit", async () => {
      const longList = Array.from({ length: 300 }, (_, i) => `prod_${i}`);
      const mockRows = [{ product: { id: "prod_0" }, category: null }];
      mockLimit.mockResolvedValueOnce(mockRows);

      const result = await getWishlistProducts(longList);

      expect(mockLimit).toHaveBeenCalledWith(200);
      expect(result).toEqual(mockRows);
    });

    it("catches errors and returns [] when query fails", async () => {
      mockLimit.mockRejectedValueOnce(new Error("Query failed"));

      const result = await getWishlistProducts(["prod_1"]);
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch wishlist products",
        expect.any(Error),
      );
    });
  });
});
