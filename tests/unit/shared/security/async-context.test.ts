import { describe, it, expect, vi, beforeEach } from "vitest";
import { runWithCorrelationId, getRequestId } from "@/shared/security/async-context";
import { headers } from "next/headers";
import { logger } from "@/shared/logging/logger";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("asyncContext Utility & Correlation ID Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a new UUID if no header is present", async () => {
    vi.mocked(headers).mockResolvedValue({
      get: () => null,
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await runWithCorrelationId(async () => {
      const rid = getRequestId();
      expect(rid).toBeDefined();
      expect(rid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  it("should propagate correlation ID from x-request-id header", async () => {
    const customId = "test-correlation-12345";
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === "x-request-id" ? customId : null),
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await runWithCorrelationId(async () => {
      expect(getRequestId()).toBe(customId);
    });
  });

  it("should propagate correlation ID across async jumps", async () => {
    const customId = "async-jump-id-999";
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === "x-request-id" ? customId : null),
    } as unknown as Awaited<ReturnType<typeof headers>>);

    await runWithCorrelationId(async () => {
      expect(getRequestId()).toBe(customId);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(getRequestId()).toBe(customId);
    });
  });

  it("should default to empty / newly generated UUID if headers() throws", async () => {
    vi.mocked(headers).mockRejectedValue(new Error("Headers not available"));

    await runWithCorrelationId(async () => {
      const rid = getRequestId();
      expect(rid).toBeDefined();
      expect(rid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  it("logger should output request ID in development output format", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      const customId = "dev-logger-test-id";
      vi.mocked(headers).mockResolvedValue({
        get: (name: string) => (name === "x-request-id" ? customId : null),
      } as unknown as Awaited<ReturnType<typeof headers>>);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runWithCorrelationId(async () => {
        logger.info("Test log message");
        expect(logSpy).toHaveBeenCalledWith(
          "%s %s %s",
          `[INFO] [${customId}]`,
          "Test log message",
          "",
        );
      });

      logSpy.mockRestore();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
