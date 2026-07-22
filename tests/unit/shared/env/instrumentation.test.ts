import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/shared/env/server", () => ({
  validateServerEnv: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureRequestError: vi.fn(),
}));

import { register } from "@/instrumentation";

describe("Production startup guard in instrumentation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws a fatal error if VERCEL_ENV is production and CLERK_SECRET_KEY is a test key", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.CLERK_SECRET_KEY = "sk_test_ci_dummy";

    await expect(register()).rejects.toThrow(
      "FATAL: test Clerk key detected in production environment — refusing to start.",
    );
  });

  it("throws a fatal error if VERCEL_ENV is production and CLERK_SECRET_KEY starts with sk_test_", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.CLERK_SECRET_KEY = "sk_test_12345";

    await expect(register()).rejects.toThrow(
      "FATAL: test Clerk key detected in production environment — refusing to start.",
    );
  });

  it("throws a fatal error if VERCEL_ENV is production and CLERK_SECRET_KEY is empty", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.CLERK_SECRET_KEY = "";

    await expect(register()).rejects.toThrow(
      "FATAL: test Clerk key detected in production environment — refusing to start.",
    );
  });

  it("does NOT throw the fatal error if VERCEL_ENV is NOT production (e.g. preview)", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.CLERK_SECRET_KEY = "sk_test_ci_dummy";

    // It should just resolve (or try to load sentry config depending on NEXT_RUNTIME, but we aren't setting that)
    await expect(register()).resolves.toBeUndefined();
  });

  it("does NOT throw if VERCEL_ENV is production and CLERK_SECRET_KEY is a live key", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.CLERK_SECRET_KEY = "sk_live_12345";

    await expect(register()).resolves.toBeUndefined();
  });
});
