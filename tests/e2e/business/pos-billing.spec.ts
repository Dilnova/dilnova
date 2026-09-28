import { test, expect } from "@playwright/test";
import { authStateExists } from "../helpers/env";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { loadSecurityFixtureContext } from "../helpers/security-fixtures";

test.beforeEach(() => {
  test.skip(
    !authStateExists("vendor-admin"),
    "Run auth.setup with E2E_VENDOR_ADMIN_EMAIL to enable this suite.",
  );
});

let testBranchId: string | null = null;
let testProductId: string | null = null;

test.beforeAll(async () => {
  if (process.env.DATABASE_URL) {
    try {
      const context = await loadSecurityFixtureContext();
      const orgId = context?.vendorOrgId;
      if (orgId) {
        // Ensure branch exists
        const existingBranch = await db.query.branches.findFirst({
          where: eq(schema.branches.orgId, orgId),
        });
        if (!existingBranch) {
          const [branch] = await db
            .insert(schema.branches)
            .values({
              name: "E2E POS Test Branch",
              orgId,
              address: "123 Test Street",
            })
            .returning({ id: schema.branches.id });
          testBranchId = branch.id;
        }

        // Ensure active product exists
        const existingProduct = await db.query.products.findFirst({
          where: and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")),
        });
        if (!existingProduct) {
          const [product] = await db
            .insert(schema.products)
            .values({
              name: "E2E POS Register Product",
              price: 1500,
              orgId,
              status: "active",
              type: "product",
            })
            .returning({ id: schema.products.id });
          testProductId = product.id;
        }
      }
    } catch {
      // Best-effort fixture seeding for local DB
    }
  }
});

test.afterAll(async () => {
  if (process.env.DATABASE_URL) {
    try {
      if (testProductId) {
        await db.delete(schema.products).where(eq(schema.products.id, testProductId));
      }
      if (testBranchId) {
        await db.delete(schema.branches).where(eq(schema.branches.id, testBranchId));
      }
    } catch {
      // Best-effort fixture cleanup
    }
  }
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
