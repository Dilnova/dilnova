import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logClientError, logClientWarning } from "@/shared/errors/client-error";
import {
  logClientError as logClientErrorBarrel,
  logClientWarning as logClientWarningBarrel,
} from "@/shared/logging/client";

describe("Client-side Sanitized Error and Warning Logging", () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("Development Environment (NODE_ENV = 'development')", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("logs the raw error object and stack trace in development for DX", () => {
      const error = new Error("Database connection failure with credentials");
      error.stack = "Error: Database connection failure\n    at dbConnect (/src/db.ts:42:10)";

      logClientError("[TestBoundary] Failed to render component", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[TestBoundary] Failed to render component",
        error,
      );
      const loggedError = consoleErrorSpy.mock.calls[0][1] as Error;
      expect(loggedError.message).toBe("Database connection failure with credentials");
      expect(loggedError.stack).toBe(error.stack);
    });

    it("logs prefix only if error is not provided in development", () => {
      logClientError("[TestBoundary] Unhandled component error");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[TestBoundary] Unhandled component error");
    });

    it("logs prefix and raw payload in console.warn during development", () => {
      const warnPayload = { code: "STALE_CACHE", details: "/api/locations" };
      logClientWarning("Cache warning", warnPayload);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Cache warning", warnPayload);
    });

    it("logs prefix only in console.warn if payload is omitted in development", () => {
      logClientWarning("Simple warning");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Simple warning");
    });
  });

  describe("Production Environment (NODE_ENV = 'production')", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("sanitizes error output and does NOT leak raw error object, stack trace, or internal message", () => {
      const rawError = new Error(
        "FATAL: relation 'users_private' does not exist at postgres://user:pass@db:5432",
      );
      rawError.stack = "Error: FATAL\n    at pgClient (/internal/server/db.ts:100:15)";

      logClientError("[ErrorBoundary] React error boundary caught exception", rawError);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [prefix, payload] = consoleErrorSpy.mock.calls[0];

      expect(prefix).toBe("[ErrorBoundary] React error boundary caught exception");
      // Must not be the raw Error instance
      expect(payload).not.toBe(rawError);
      expect(payload).not.toBeInstanceOf(Error);

      // Must not contain sensitive message or stack trace
      expect(JSON.stringify(payload)).not.toContain("users_private");
      expect(JSON.stringify(payload)).not.toContain("postgres://");
      expect(JSON.stringify(payload)).not.toContain("/internal/server/db.ts");

      // Must contain safe sanitized metadata
      expect(payload).toEqual({
        digest: undefined,
        message: "An unexpected error occurred. Ref: unknown",
      });
    });

    it("includes Next.js digest reference ID if available in error object", () => {
      const errorWithDigest = Object.assign(new Error("Internal Server Error"), {
        digest: "NEXT_DIGEST_abc12345",
      });

      logClientError("[ErrorBoundary] React error boundary caught exception", errorWithDigest);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [, payload] = consoleErrorSpy.mock.calls[0];

      expect(payload).toEqual({
        digest: "NEXT_DIGEST_abc12345",
        message: "An unexpected error occurred. Ref: NEXT_DIGEST_abc12345",
      });
    });

    it("prioritizes explicitly passed digest over error.digest", () => {
      const errorWithDigest = Object.assign(new Error("Internal Server Error"), {
        digest: "digest_from_property",
      });

      logClientError(
        "[ErrorBoundary] React error boundary caught exception",
        errorWithDigest,
        "digest_from_param",
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [, payload] = consoleErrorSpy.mock.calls[0];

      expect(payload).toEqual({
        digest: "digest_from_param",
        message: "An unexpected error occurred. Ref: digest_from_param",
      });
    });

    it("sanitizes warnings in production by logging ONLY the message prefix without raw error payload", () => {
      const sensitiveWarnPayload = {
        token: "secret_api_token_123",
        url: "https://internal.api.local/v1/resource",
      };

      logClientWarning("Background sync warning", sensitiveWarnPayload);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      // Warning must be called with ONLY the prefix string
      expect(consoleWarnSpy).toHaveBeenCalledWith("Background sync warning");
      // Must not leak the payload
      expect(consoleWarnSpy.mock.calls[0].length).toBe(1);
    });
  });

  describe("Barrel export parity (@/shared/logging/client)", () => {
    it("exports logClientError and logClientWarning identical to @/shared/errors/client-error", () => {
      expect(logClientErrorBarrel).toBe(logClientError);
      expect(logClientWarningBarrel).toBe(logClientWarning);
    });
  });
});
