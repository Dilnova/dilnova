import { test, expect } from "@playwright/test";
import { authStateExists } from "../helpers/env";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { loadSecurityFixtureContext, ensureVendorPosState } from "../helpers/security-fixtures";

test.beforeEach(() => {
  test.skip(
    !authStateExists("vendor-admin"),
    "Run auth.setup with E2E_VENDOR_ADMIN_EMAIL to enable this suite.",
  );
});

let testBranchId: string | null = null;
let testProductId: string | null = null;

test.beforeAll(async () => {
  try {
    const context = await loadSecurityFixtureContext();
    const orgId = context?.vendorOrgId;
    if (orgId) {
      const state = await ensureVendorPosState(orgId);
      testBranchId = state?.branchId ?? null;
      testProductId = state?.productId ?? null;
    }
  } catch {
    // Best-effort fixture seeding
  }
});

test.afterAll(async () => {
  if (process.env.DATABASE_URL) {
    try {
      if (testProductId) {
        await db.delete(schema.inventory).where(eq(schema.inventory.productId, testProductId));
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

    // 2. Wait for POS register to load
    await expect(page.locator("body")).not.toBeEmpty();

    // Verify access is granted (no RestrictedAccess block)
    const accessBlocked = await page
      .getByText(/You don't have access to this feature|Upgrade to IMS Pro|Restricted Access/i)
      .isVisible();
    expect(
      accessBlocked,
      "Vendor should have active POS billing access, not a RestrictedAccess block",
    ).toBe(false);

    // 3. Select a product from grid (click first button that looks like a product card)
    const productCard = page
      .locator("button")
      .filter({ hasText: /Rs|LKR|\$/i })
      .first();
    await expect(productCard, "POS product grid should contain at least one item").toBeVisible({
      timeout: 15000,
    });

    await productCard.click();

    // 4. Verify added to ticket
    const chargeBtn = page.getByRole("button", { name: /Charge|Complete Checkout/i }).first();
    await expect(chargeBtn).toBeVisible({ timeout: 10000 });

    // 5. Checkout
    await chargeBtn.click();

    // 6. Verify receipt/success modal
    const receiptModal = page
      .getByRole("dialog")
      .or(page.locator(".modal"))
      .or(page.getByText(/Receipt|Transaction Successful|Order/i));
    await expect(receiptModal.first()).toBeVisible({ timeout: 10000 });
  });
});
