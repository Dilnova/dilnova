import { test, expect } from "@playwright/test";
import { authStateExists } from "../helpers/env";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { loadSecurityFixtureContext } from "../helpers/security-fixtures";

test.beforeEach(() => {
  test.skip(
    !authStateExists("customer"),
    "Run auth.setup with E2E_CUSTOMER_EMAIL to enable this suite.",
  );
});

let testProductId: string;

test.beforeAll(async () => {
  if (process.env.DATABASE_URL) {
    const context = await loadSecurityFixtureContext();
    const orgId = context?.vendorOrgId || "e2e-dummy-org";

    const [product] = await db
      .insert(schema.products)
      .values({
        name: "E2E Test Checkout Product",
        price: 1999,
        orgId,
        description: "Dummy product for E2E checkout testing",
        status: "active",
        type: "product",
      })
      .returning({ id: schema.products.id });

    testProductId = product.id;
  }
});

test.afterAll(async () => {
  if (process.env.DATABASE_URL && testProductId) {
    await db.delete(schema.products).where(eq(schema.products.id, testProductId));
  }
});

test.describe("Customer Checkout Flow", () => {
  test("can add item to cart and checkout", async ({ page }) => {
    // 1. Navigate to products
    await page.goto("/products");
    await expect(page).toHaveURL(/\/products/);

    // 2. Add first product to cart (if any exist)
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });

    await firstProduct.click();
    await page.waitForURL(/\/products\/.+/);

    // Click "Add to Cart"
    const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // 3. Navigate to Cart
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart/);

    // Verify item in cart
    const checkoutBtn = page.getByRole("button", { name: /checkout/i }).first();
    await expect(checkoutBtn).toBeVisible();

    // 4. Proceed to checkout
    await checkoutBtn.click();

    // 5. Verify success state
    await expect(page.getByText(/Order Placed|Order Confirmed!/i)).toBeVisible({ timeout: 15000 });

    // 6. Navigate to Invoice
    const viewInvoiceBtn = page.getByRole("link", { name: /view invoice/i });

    // Some cart items might just be added to existing orders or handled differently,
    // but if the view invoice button is there, we should verify the invoice page loads.
    if (await viewInvoiceBtn.isVisible()) {
      await viewInvoiceBtn.click();

      // 7. Verify Invoice Page
      await expect(page).toHaveURL(/\/customer\/invoice\/.+/);
      await expect(page.locator("body")).toContainText(
        /Automated Simulated Register checkout|Payment|Pickup/i,
      );
    }
  });
});
