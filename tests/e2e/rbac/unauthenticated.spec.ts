import { test, expect } from "@playwright/test";
import { isAuthWallUrl, PROTECTED_ROUTES } from "../helpers/routes";

test.describe("Unauthenticated access", () => {
  for (const [label, path] of Object.entries(PROTECTED_ROUTES)) {
    test(`blocks ${label} (${path})`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "networkidle" });

      // A non-OK response (e.g. 503 auth service down, 403 WAF) already means blocked.
      const initiallyBlocked = response !== null && !response.ok();

      if (!initiallyBlocked) {
        // Wait for Next.js client-side router to process the RSC redirect
        await page
          .waitForURL((url) => isAuthWallUrl(url.toString()), { timeout: 10000 })
          .catch(() => {});
      }

      const finalUrl = page.url();
      const status = response?.status() ?? 0;
      console.log(`URL for ${label}:`, finalUrl, `(status: ${status})`);

      const blocked = initiallyBlocked || isAuthWallUrl(finalUrl);
      expect(blocked).toBe(true);
    });
  }
});
