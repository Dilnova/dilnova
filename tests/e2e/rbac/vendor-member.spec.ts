import { test, expect } from "@playwright/test";
import { authStateExists } from "../helpers/env";
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from "../helpers/routes";

test.beforeEach(() => {
  test.skip(
    !authStateExists("vendor-member"),
    "Run auth.setup with E2E_VENDOR_MEMBER_EMAIL to enable this suite.",
  );
});

test.describe("Vendor member RBAC", () => {
  test("can access vendor console", async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(/\/vendor/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace("/", "\\/")}$`));
  });

  test("can access POS billing", async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendorBilling);
    await expect(page).toHaveURL(/\/vendor\/billing/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace("/", "\\/")}$`));
  });

  test("cannot access org admin console", async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.admin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace("/", "\\/")}$`));
  });

  test("cannot access superadmin console", async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace("/", "\\/")}$`));
  });
});
