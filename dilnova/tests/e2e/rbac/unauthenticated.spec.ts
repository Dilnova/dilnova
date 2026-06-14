import { test, expect } from '../fixtures/clerk';
import { isAuthWallUrl, PROTECTED_ROUTES } from '../helpers/routes';

test.describe('Unauthenticated access', () => {
  for (const [label, path] of Object.entries(PROTECTED_ROUTES)) {
    test(`blocks ${label} (${path})`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(isAuthWallUrl(page.url())).toBe(true);
    });
  }
});
