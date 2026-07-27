import { describe, expect, it } from "vitest";
import {
  calculatePreorderPayment,
  canAcceptPreorderQuantity,
  validatePreorderConfig,
} from "@/features/catalog/preorder";

describe("Pre-Order Helper Logic", () => {
  describe("validatePreorderConfig", () => {
    it("approves non-preorder configuration", () => {
      const result = validatePreorderConfig({
        isPreorder: false,
        preorderType: "full_upfront",
        price: 5000,
      });
      expect(result.valid).toBe(true);
    });

    it("approves valid deposit preorder configuration", () => {
      const result = validatePreorderConfig({
        isPreorder: true,
        preorderType: "deposit",
        price: 10000,
        depositAmount: 2000,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects deposit exceeding total product price", () => {
      const result = validatePreorderConfig({
        isPreorder: true,
        preorderType: "deposit",
        price: 10000,
        depositAmount: 15000,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Deposit amount cannot exceed");
    });

    it("rejects zero/negative deposit amount", () => {
      const result = validatePreorderConfig({
        isPreorder: true,
        preorderType: "deposit",
        price: 10000,
        depositAmount: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Deposit amount must be greater than zero");
    });
  });

  describe("calculatePreorderPayment", () => {
    it("calculates full upfront preorder payment correctly", () => {
      const calc = calculatePreorderPayment({
        isPreorder: true,
        preorderType: "full_upfront",
        price: 12000,
      });
      expect(calc.upfrontAmountPerUnit).toBe(12000);
      expect(calc.balanceDuePerUnit).toBe(0);
      expect(calc.totalPricePerUnit).toBe(12000);
    });

    it("calculates deposit-based preorder payment correctly", () => {
      const calc = calculatePreorderPayment({
        isPreorder: true,
        preorderType: "deposit",
        price: 12000,
        depositAmount: 3000,
      });
      expect(calc.upfrontAmountPerUnit).toBe(3000);
      expect(calc.balanceDuePerUnit).toBe(9000);
      expect(calc.totalPricePerUnit).toBe(12000);
    });

    it("calculates pay-later preorder payment correctly", () => {
      const calc = calculatePreorderPayment({
        isPreorder: true,
        preorderType: "pay_later",
        price: 12000,
      });
      expect(calc.upfrontAmountPerUnit).toBe(0);
      expect(calc.balanceDuePerUnit).toBe(12000);
      expect(calc.totalPricePerUnit).toBe(12000);
    });
  });

  describe("canAcceptPreorderQuantity", () => {
    it("allows unlimited pre-orders when maxQuantity is null or undefined", () => {
      const res = canAcceptPreorderQuantity(5, null, 150);
      expect(res.allowed).toBe(true);
      expect(res.remainingSlots).toBeNull();
    });

    it("allows orders within remaining cap", () => {
      const res = canAcceptPreorderQuantity(3, 10, 5);
      expect(res.allowed).toBe(true);
      expect(res.remainingSlots).toBe(5);
    });

    it("rejects orders exceeding remaining cap", () => {
      const res = canAcceptPreorderQuantity(6, 10, 5);
      expect(res.allowed).toBe(false);
      expect(res.remainingSlots).toBe(5);
    });
  });
});
