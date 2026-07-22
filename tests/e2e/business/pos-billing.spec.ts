import { test, expect } from "@playwright/test";
import { authStateExists } from "../helpers/env";
import { PROTECTED_ROUTES } from "../helpers/routes";

test.beforeEach(() => {
  test.skip(
    !authStateExists("vendor-admin"),
    "Run auth.setup with E2E_VENDOR_ADMIN_EMAIL to enable this suite.",
  );
});

test.describe("POS Billing Flow", () => {
  test("vendor can load register and ring up item", async ({ page }) => {
    // 1. Navigate to billing
    await page.goto("/vendor/billing");

    // Check if branch selection is needed or access is blocked
    const accessBlocked = await page.getByText(/access/i).isVisible();
    if (accessBlocked) {
      test.skip(true, "Vendor user does not have access or no branches exist.");
      return;
    }

    // 2. Wait for POS to load (looking for typical POS UI elements)
    await expect(page.locator("body")).not.toBeEmpty();

    // 3. Select a product from grid (click first button that looks like a product card)
    const productCard = page
      .locator("button")
      .filter({ hasText: /Rs|LKR|\$/i })
      .first();
    const hasProducts = await productCard.isVisible();
    if (!hasProducts) {
      test.skip(true, "No products available in POS grid to test.");
      return;
    }

    await productCard.click();

    // 4. Verify added to ticket
    const chargeBtn = page.getByRole("button", { name: /Charge/i }).first();
    await expect(chargeBtn).toBeVisible();

    // 5. Checkout
    await chargeBtn.click();

    // 6. Verify receipt/success modal
    const receiptModal = page
      .getByRole("dialog")
      .or(page.locator(".modal"))
      .or(page.getByText(/Receipt/i));
    await expect(receiptModal.first()).toBeVisible();
  });
});
