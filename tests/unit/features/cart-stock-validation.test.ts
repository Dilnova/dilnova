import { describe, expect, it } from "vitest";

function evaluateItemStock(opts: {
  productStatus: string;
  stockAvailability: string;
  centralStock: number;
  branchStock: number | null;
  branchName: string | null;
  requestedQuantity: number;
}) {
  const {
    productStatus,
    stockAvailability,
    centralStock,
    branchStock,
    branchName,
    requestedQuantity,
  } = opts;

  const effectiveAvailable =
    branchStock !== null ? Math.min(centralStock, branchStock) : centralStock;

  let isStockValid = true;
  let errorMessage: string | null = null;

  if (productStatus !== "active" || stockAvailability === "out_of_stock") {
    isStockValid = false;
    errorMessage = "Item is currently out of stock.";
  } else if (effectiveAvailable < requestedQuantity || effectiveAvailable <= 0) {
    isStockValid = false;
    if (branchStock !== null && branchStock < requestedQuantity) {
      errorMessage = `Only ${branchStock} units available at ${branchName || "branch"}.`;
    } else {
      errorMessage = `Only ${centralStock} units available in stock.`;
    }
  }

  return {
    isStockValid,
    errorMessage,
    availableStock: Math.max(0, effectiveAvailable),
  };
}

describe("Cart Stock Pre-Checkout Validation Logic", () => {
  it("approves active product with sufficient central stock", () => {
    const res = evaluateItemStock({
      productStatus: "active",
      stockAvailability: "in_stock",
      centralStock: 10,
      branchStock: null,
      branchName: null,
      requestedQuantity: 2,
    });

    expect(res.isStockValid).toBe(true);
    expect(res.errorMessage).toBeNull();
    expect(res.availableStock).toBe(10);
  });

  it("rejects out_of_stock product status", () => {
    const res = evaluateItemStock({
      productStatus: "active",
      stockAvailability: "out_of_stock",
      centralStock: 10,
      branchStock: null,
      branchName: null,
      requestedQuantity: 1,
    });

    expect(res.isStockValid).toBe(false);
    expect(res.errorMessage).toBe("Item is currently out of stock.");
  });

  it("rejects when requested quantity exceeds central stock", () => {
    const res = evaluateItemStock({
      productStatus: "active",
      stockAvailability: "in_stock",
      centralStock: 3,
      branchStock: null,
      branchName: null,
      requestedQuantity: 5,
    });

    expect(res.isStockValid).toBe(false);
    expect(res.errorMessage).toBe("Only 3 units available in stock.");
    expect(res.availableStock).toBe(3);
  });

  it("rejects when requested quantity exceeds branch inventory allocation", () => {
    const res = evaluateItemStock({
      productStatus: "active",
      stockAvailability: "in_stock",
      centralStock: 10,
      branchStock: 0,
      branchName: "Colombo Main Branch",
      requestedQuantity: 1,
    });

    expect(res.isStockValid).toBe(false);
    expect(res.errorMessage).toBe("Only 0 units available at Colombo Main Branch.");
    expect(res.availableStock).toBe(0);
  });

  it("evaluates central stock for Home Delivery when branchStock is null regardless of local branch stock", () => {
    const res = evaluateItemStock({
      productStatus: "active",
      stockAvailability: "in_stock",
      centralStock: 10,
      branchStock: null,
      branchName: null,
      requestedQuantity: 2,
    });

    expect(res.isStockValid).toBe(true);
    expect(res.errorMessage).toBeNull();
    expect(res.availableStock).toBe(10);
  });
});
