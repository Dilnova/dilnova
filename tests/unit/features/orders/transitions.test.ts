import { describe, it, expect, vi, beforeEach } from "vitest";
import { applySimulatedOrderStatusChange } from "@/features/orders/transitions";
import * as stockModule from "@/features/orders/stock";

// Mock the stock depletion/restoration functions so we don't need a real DB for them either
vi.mock("@/features/orders/stock", () => ({
  depleteOnlineOrderItemStock: vi.fn(),
  restoreOnlineOrderItemStock: vi.fn(),
}));

describe("Order Transitions", () => {
  let mockTx: Record<string, unknown>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mocking the Drizzle chain: tx.select().from().innerJoin().where()
    mockSelect = vi.fn().mockReturnThis();
    const mockFrom = vi.fn().mockReturnThis();
    const mockInnerJoin = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([]);

    // Mocking tx.update().set().where()
    mockUpdate = vi.fn().mockReturnThis();
    const mockSet = vi.fn().mockReturnThis();
    const mockUpdateWhere = vi.fn().mockResolvedValue([{ id: "order-123" }]);

    mockTx = {
      select: mockSelect,
      from: mockFrom,
      innerJoin: mockInnerJoin,
      where: mockWhere,
      update: mockUpdate,
      set: mockSet,
    };

    // Fix the chain structure so returning 'this' works smoothly
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: mockWhere,
        }),
      }),
    });

    mockTx.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: mockUpdateWhere,
      }),
    });
  });

  describe("applySimulatedOrderStatusChange()", () => {
    it("depletes stock when transitioning from pending_payment to fulfilled", async () => {
      // Setup mock order items to be returned by the DB
      const mockOrderItems = [
        {
          productId: "prod-1",
          productName: "Test Product 1",
          vendorOrgId: "vendor-1",
          quantity: 2,
          productType: "product",
        },
      ];
      // Override the where() resolution for this specific test
      mockTx.select().from().innerJoin().where = vi.fn().mockResolvedValue(mockOrderItems);

      const order: Record<string, unknown> = {
        id: "order-123",
        status: "pending_payment",
        stockDepleted: false,
        pickupBranchId: "branch-1",
      };

      const result = await applySimulatedOrderStatusChange(
        mockTx as unknown as Parameters<typeof applySimulatedOrderStatusChange>[0],
        {
          order: order as unknown as Parameters<typeof applySimulatedOrderStatusChange>[1]["order"],
          newStatus: "fulfilled",
          userId: "user-1",
        },
      );

      expect(result.stockDepleted).toBe(true);
      expect(stockModule.depleteOnlineOrderItemStock).toHaveBeenCalledTimes(1);
      expect(stockModule.depleteOnlineOrderItemStock).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          productId: "prod-1",
          quantity: 2,
          orderId: "order-123",
        }),
      );

      // Verify payment verification fields were added to the update payload
      const setCallArgs = (mockTx.update as ReturnType<typeof vi.fn>)().set.mock.calls[0][0];
      expect(setCallArgs.status).toBe("fulfilled");
      expect(setCallArgs.stockDepleted).toBe(true);
      expect(setCallArgs.paymentVerifiedAt).toBeInstanceOf(Date);
      expect(setCallArgs.paymentVerifiedBy).toBe("user-1");
    });

    it("restores stock when transitioning from fulfilled to cancelled", async () => {
      const mockOrderItems = [
        {
          productId: "prod-2",
          quantity: 1,
          vendorOrgId: "vendor-1",
          productType: "product",
        },
      ];
      (mockTx.select as ReturnType<typeof vi.fn>)().from().innerJoin().where = vi
        .fn()
        .mockResolvedValue(mockOrderItems);

      const order: Record<string, unknown> = {
        id: "order-456",
        status: "fulfilled",
        stockDepleted: true, // currently depleted
        pickupBranchId: "branch-1",
      };

      const result = await applySimulatedOrderStatusChange(
        mockTx as unknown as Parameters<typeof applySimulatedOrderStatusChange>[0],
        {
          order: order as unknown as Parameters<typeof applySimulatedOrderStatusChange>[1]["order"],
          newStatus: "cancelled",
          userId: "user-1",
        },
      );

      expect(result.stockDepleted).toBe(false);
      expect(stockModule.restoreOnlineOrderItemStock).toHaveBeenCalledTimes(1);

      const setCallArgs = (mockTx.update as ReturnType<typeof vi.fn>)().set.mock.calls[0][0];
      expect(setCallArgs.status).toBe("cancelled");
      expect(setCallArgs.stockDepleted).toBe(false);
      expect(setCallArgs.paymentSlipUrl).toBe(null);
    });

    it("does not deplete stock if items are not of type product", async () => {
      const mockOrderItems = [
        {
          productId: "service-1",
          quantity: 1,
          productType: "service", // Should be ignored
        },
      ];
      (mockTx.select as ReturnType<typeof vi.fn>)().from().innerJoin().where = vi
        .fn()
        .mockResolvedValue(mockOrderItems);

      const order: Record<string, unknown> = {
        id: "order-789",
        status: "pending_payment",
        stockDepleted: false,
      };

      await applySimulatedOrderStatusChange(
        mockTx as unknown as Parameters<typeof applySimulatedOrderStatusChange>[0],
        {
          order: order as unknown as Parameters<typeof applySimulatedOrderStatusChange>[1]["order"],
          newStatus: "fulfilled",
          userId: "user-1",
        },
      );

      expect(stockModule.depleteOnlineOrderItemStock).not.toHaveBeenCalled();
    });
  });
});
