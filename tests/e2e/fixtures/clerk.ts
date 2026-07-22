/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { loadE2EEnv } from "../helpers/load-env";
import { hasClerkApiKeys } from "../helpers/env";

/** Injects Clerk testing token on every page to bypass bot detection when keys are available. */
export const test = base.extend({
  page: async ({ page }, use) => {
    loadE2EEnv();
    if (hasClerkApiKeys()) {
      try {
        if (!process.env.CLERK_TESTING_TOKEN) {
          await clerkSetup();
        }
        await setupClerkTestingToken({ page });
      } catch {
        // Public/unauthenticated redirect tests can still run without the testing token.
      }
    }
    await use(page);
  },
});

export { expect } from "@playwright/test";
