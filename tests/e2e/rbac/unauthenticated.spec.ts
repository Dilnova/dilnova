import { test, expect } from "../fixtures/clerk";
import { isAuthWallUrl, PROTECTED_ROUTES } from "../helpers/routes";

test.describe("Unauthenticated access", () => {
  for (const [label, path] of Object.entries(PROTECTED_ROUTES)) {
    test(`blocks ${label} (${path})`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });

      // Wait for Next.js client-side router to process the RSC redirect
      await page
        .waitForURL((url) => isAuthWallUrl(url.toString()), { timeout: 10000 })
        .catch(() => {});

      console.log(`URL for ${label}:`, page.url());
      expect(isAuthWallUrl(page.url())).toBe(true);
    });
  }
});
