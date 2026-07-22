# Playwright — Official Reference

> **Version in use**: `^1.57.0`
> **Official docs**: https://playwright.dev/docs/intro

---

## Key Docs Links

| Topic                    | URL                                            |
| ------------------------ | ---------------------------------------------- |
| Getting Started          | https://playwright.dev/docs/intro              |
| Writing Tests            | https://playwright.dev/docs/writing-tests      |
| Assertions               | https://playwright.dev/docs/test-assertions    |
| Locators                 | https://playwright.dev/docs/locators           |
| Auto-Waiting             | https://playwright.dev/docs/actionability      |
| Page Object Model        | https://playwright.dev/docs/pom                |
| Authentication           | https://playwright.dev/docs/auth               |
| API Testing              | https://playwright.dev/docs/api-testing        |
| Configuration            | https://playwright.dev/docs/test-configuration |
| Reporters                | https://playwright.dev/docs/test-reporters     |
| CI/CD                    | https://playwright.dev/docs/ci                 |
| Trace Viewer             | https://playwright.dev/docs/trace-viewer       |
| Test Generator (Codegen) | https://playwright.dev/docs/codegen            |

---

## How Dilnova Uses Playwright

- **E2E tests** for critical user flows (checkout, auth, catalog management)
- Config in `playwright.config.ts`
- Tests in `playwright/` directory
- Uses `@clerk/testing` for authenticated E2E flows

### Commands

```bash
pnpm test:e2e              # Run all E2E tests
pnpm test:e2e:ui           # Run with interactive UI
pnpm test:e2e:install      # Install Chromium browser
```

### Common Pattern

```ts
import { test, expect } from "@playwright/test";

test("customer can view product catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
});
```
