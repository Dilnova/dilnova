import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('vendor-admin'), 'Run auth.setup with E2E_VENDOR_ADMIN_EMAIL to enable this suite.');
});

test.describe('Vendor admin RBAC', () => {
  test('can access vendor console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(/\/vendor/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('can access org admin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.admin);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access superadmin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });
});
