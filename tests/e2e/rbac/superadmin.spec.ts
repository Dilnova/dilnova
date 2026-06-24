import { test, expect } from '@playwright/test';
import { authStateExists } from '../helpers/env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from '../helpers/routes';

test.beforeEach(() => {
  test.skip(!authStateExists('superadmin'), 'Run auth.setup with E2E_SUPERADMIN_EMAIL to enable this suite.');
});

test.describe('Superadmin RBAC', () => {
  test('can access superadmin console', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.superadmin);
    await expect(page).toHaveURL(/\/superadmin/);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });

  test('cannot access vendor console without org membership', async ({ page }) => {
    await page.goto(PROTECTED_ROUTES.vendor);
    await expect(page).toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));
  });
});
