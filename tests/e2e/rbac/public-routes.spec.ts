import { test, expect } from "@playwright/test";
import { PUBLIC_ROUTES } from "../helpers/routes";

test.describe("Public routes", () => {
  test.setTimeout(60_000);

  for (const route of PUBLIC_ROUTES) {
    test(`${route} is accessible without sign-in`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "commit", timeout: 45_000 });
      expect(response?.status()).toBeLessThan(400);
      await expect(page).not.toHaveURL(/sign-in/);
    });
  }
});

test("unauthorized page is reachable without sign-in", async ({ page }) => {
  const response = await page.goto("/unauthorized", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: /403 - Unauthorized/i })).toBeVisible();
});
