import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('customer'), 'Run auth.setup with E2E_CUSTOMER_EMAIL to enable this suite.');
});

test.describe('Customer RBAC', () => {
  test('can access customer portal', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.customer);
    await expect(page).toHaveURL(/\/customer/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access vendor console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access superadmin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });
});
