import { describe, it, expect } from "vitest";
import { z } from "zod";
import { actionSuccess, actionFailure, type ActionResponse } from "@/shared/types/action-response";
import { ActionError } from "@/shared/errors/action-error";
import {
  withActionHandler,
  extractActionErrorMessage as extractFromActionHandler,
} from "@/shared/errors/action-handler";
import { extractActionErrorMessage as extractFromClientError } from "@/shared/errors/client-error";

describe("ActionResponse Contracts & Helpers", () => {
  it("creates a standardized ActionSuccess response with data", () => {
    const res = actionSuccess({ id: "prod_123", name: "Widget" });
    expect(res).toEqual({
      success: true,
      data: { id: "prod_123", name: "Widget" },
      error: null,
    });
  });

  it("creates a standardized ActionSuccess response with void/empty data", () => {
    const res = actionSuccess();
    expect(res).toEqual({
      success: true,
      data: undefined,
      error: null,
    });
  });

  it("creates a standardized ActionFailure response", () => {
    const res = actionFailure("Resource not found");
    expect(res).toEqual({
      success: false,
      error: "Resource not found",
      data: null,
    });
  });
});

describe("withActionHandler", () => {
  it("returns actionSuccess when the wrapped function executes successfully", async () => {
    const res = await withActionHandler("testAction", async () => {
      return { total: 42 };
    });

    expect(res.success).toBe(true);
    expect(res.data).toEqual({ total: 42 });
    expect(res.error).toBeNull();
  });

  it("catches Zod validation errors and returns actionFailure with field issue", async () => {
    const schema = z.object({ email: z.string().email("Invalid email format") });

    const res = await withActionHandler("testZodAction", async () => {
      schema.parse({ email: "not-an-email" });
      return true;
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid email format");
    expect(res.data).toBeNull();
  });

  it("catches ActionError and returns actionFailure with the specified message", async () => {
    const res = await withActionHandler("testActionError", async () => {
      throw new ActionError("Insufficient permissions to delete branch.");
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Insufficient permissions to delete branch.");
    expect(res.data).toBeNull();
  });

  it("preserves rate limit error messages and returns actionFailure", async () => {
    const res = await withActionHandler("testRateLimit", async () => {
      throw new Error("Rate limit exceeded. Please try again in 14 seconds.");
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Rate limit exceeded. Please try again in 14 seconds.");
    expect(res.data).toBeNull();
  });

  it("redacts unexpected server errors to protect sensitive information", async () => {
    const res = await withActionHandler("testUnexpected", async () => {
      throw new Error("FATAL: connection to postgresql://secret:pass@localhost:5432 failed");
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("An unexpected error occurred. Please try again.");
    expect(res.data).toBeNull();
  });

  it("handles non-Error thrown exceptions gracefully", async () => {
    const res = await withActionHandler("testNonError", async () => {
      return Promise.reject("Unknown string error");
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("An unexpected error occurred.");
    expect(res.data).toBeNull();
  });
});

describe("extractActionErrorMessage (Unification & Client Resilience)", () => {
  const extractors = [
    { name: "shared/errors/client-error", fn: extractFromClientError },
    { name: "shared/errors/action-handler", fn: extractFromActionHandler },
  ];

  extractors.forEach(({ name, fn }) => {
    describe(`implementation in ${name}`, () => {
      it("extracts error from standard ActionFailure object", () => {
        const failure: ActionResponse = {
          success: false,
          error: "Coupon discount code expired",
          data: null,
        };
        expect(fn(failure)).toBe("Coupon discount code expired");
      });

      it("extracts error from raw error object", () => {
        expect(fn({ error: "Inventory stock depleted" })).toBe("Inventory stock depleted");
      });

      it("extracts error from JavaScript Error instance", () => {
        expect(fn(new Error("Network connection lost"))).toBe("Network connection lost");
      });

      it("extracts error from next-safe-action string serverError", () => {
        expect(fn({ serverError: "Unauthenticated: Please sign in." })).toBe(
          "Unauthenticated: Please sign in.",
        );
      });

      it("extracts error from next-safe-action object serverError with message", () => {
        expect(fn({ serverError: { message: "Internal server fault" } })).toBe(
          "Internal server fault",
        );
      });

      it("extracts error from wrapped safe-action data payload", () => {
        expect(fn({ data: { success: false, error: "Payment slip storage unavailable" } })).toBe(
          "Payment slip storage unavailable",
        );
      });

      it("extracts error from next-safe-action validationErrors with _errors", () => {
        const result = {
          validationErrors: {
            email: { _errors: ["Invalid email format"] },
            password: { _errors: ["Must be at least 8 characters"] },
          },
        };
        expect(fn(result)).toBe(
          "Email: Invalid email format | Password: Must be at least 8 characters",
        );
      });

      it("extracts error from root formErrors or _errors in validationErrors", () => {
        expect(fn({ validationErrors: { formErrors: ["Invalid CSRF token"] } })).toBe(
          "Invalid CSRF token",
        );
        expect(fn({ validationErrors: { _errors: ["Request expired"] } })).toBe("Request expired");
      });

      it("extracts error from flat field string arrays in validationErrors", () => {
        const result = {
          validationErrors: {
            username: ["Username is already taken"],
          },
        };
        expect(fn(result)).toBe("Username: Username is already taken");
      });

      it("extracts error from generic message object", () => {
        expect(fn({ message: "Something went wrong during checkout" })).toBe(
          "Something went wrong during checkout",
        );
      });

      it("extracts error from raw primitive string", () => {
        expect(fn("Direct error message string")).toBe("Direct error message string");
      });

      it("returns user-friendly fallback for null, undefined, or empty payload", () => {
        const fallback = "An unexpected error occurred. Please try again.";
        expect(fn(null)).toBe(fallback);
        expect(fn(undefined)).toBe(fallback);
        expect(fn({})).toBe(fallback);
        expect(fn({ success: true })).toBe(fallback);
        expect(fn({ error: "   " })).toBe(fallback);
      });
    });
  });
});
