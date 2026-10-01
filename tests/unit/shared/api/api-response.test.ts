import { describe, it, expect, vi } from "vitest";
import { apiSuccess, apiError, withErrorHandler } from "@/shared/api/api-handler";
import { logger } from "@/shared/logging/logger";

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("apiSuccess", () => {
  it("creates a 200 response with success: true and data property", async () => {
    const payload = { items: ["a", "b"], count: 2 };
    const res = apiSuccess(payload);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(payload);
    // Preserves root fields for backward compatibility
    expect(body.items).toEqual(["a", "b"]);
    expect(body.count).toBe(2);
  });

  it("handles primitive and array payloads under data", async () => {
    const list = [1, 2, 3];
    const res = apiSuccess(list);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([1, 2, 3]);
  });

  it("supports custom status codes and message", async () => {
    const res = apiSuccess({ jobId: "job_123" }, { status: 202, message: "Job queued" });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Job queued");
    expect(body.jobId).toBe("job_123");
  });
});

describe("apiError", () => {
  it("creates a 400 response with success: false and error message", async () => {
    const res = apiError("Invalid input");

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid input");
  });

  it("supports custom status code, error code, and details", async () => {
    const res = apiError("Unauthorized", {
      status: 401,
      code: "AUTH_REQUIRED",
      details: { missing: ["orgId"] },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
    expect(body.code).toBe("AUTH_REQUIRED");
    expect(body.details).toEqual({ missing: ["orgId"] });
  });
});

describe("withErrorHandler", () => {
  it("returns response directly when no error occurs", async () => {
    const handler = withErrorHandler(async () => {
      return apiSuccess({ ok: true });
    });

    const res = await handler(new Request("https://example.com/api/test"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ok).toBe(true);
  });

  it("catches unhandled exceptions, logs, and returns 500 apiError", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("Database connection crashed");
    });

    const res = await handler(new Request("https://example.com/api/test"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Internal Server Error");
    expect(logger.error).toHaveBeenCalledWith(
      "[API Error]",
      expect.any(Error),
      expect.objectContaining({ url: "https://example.com/api/test" }),
    );
  });
});
