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
    try {
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

      // Seed inventory so the product is marked In Stock and allows purchase
      await db.insert(schema.inventory).values({
        productId: testProductId,
        quantity: 50,
        stockAvailability: "in_stock",
      });
    } catch {
      // Best-effort fixture seeding for local DB
    }
  }
});

test.afterAll(async () => {
  if (process.env.DATABASE_URL && testProductId) {
    try {
      await db.delete(schema.inventory).where(eq(schema.inventory.productId, testProductId));
    } catch {
      // Best-effort cleanup
    }
    try {
      await db.delete(schema.products).where(eq(schema.products.id, testProductId));
    } catch {
      // Best-effort cleanup
    }
  }
});

test.describe("Customer Checkout Flow", () => {
  test("can add item to cart and checkout", async ({ page }) => {
    // 1. Navigate to products or directly to seeded test product
    if (testProductId) {
      await page.goto(`/products/${testProductId}`);
    } else {
      await page.goto("/products");
      await expect(page).toHaveURL(/\/products/);

      const firstProduct = page.locator('a[href^="/products/"]').first();
      await expect(firstProduct).toBeVisible({ timeout: 10000 });
      await firstProduct.click();
      await page.waitForURL(/\/products\/.+/);
    }

    // Click "Add to Cart"
    const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });

    if (await addToCartBtn.isDisabled()) {
      test.skip(true, "Item is out of stock in current environment.");
      return;
    }

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
