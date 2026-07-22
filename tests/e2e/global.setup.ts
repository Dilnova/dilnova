import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { loadE2EEnv } from "./helpers/load-env";
import { hasClerkApiKeys } from "./helpers/env";

setup.describe.configure({ mode: "serial" });

setup("initialize Clerk testing token", async () => {
  loadE2EEnv();

  if (!hasClerkApiKeys()) {
    setup.skip(true, "CLERK_SECRET_KEY / publishable key missing in .env.local");
    return;
  }

  try {
    await clerkSetup();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setup.skip(true, `Clerk testing token unavailable: ${message}`);
  }
});
