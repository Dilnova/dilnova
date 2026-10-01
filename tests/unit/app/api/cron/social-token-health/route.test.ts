import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/cron/social-token-health/route";
import { checkAllVendorsSocialTokenHealth } from "@/features/social-share/services/token-health";

vi.mock("@/features/social-share/services/token-health", () => ({
  checkAllVendorsSocialTokenHealth: vi.fn(),
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GET /api/cron/social-token-health", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Fail-Closed Authorization", () => {
    it("rejects with 401 in production when no authorization header is provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "test-cron-secret";

      const request = new Request("https://example.com/api/cron/social-token-health");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ success: false, error: "Unauthorized" });
      expect(checkAllVendorsSocialTokenHealth).not.toHaveBeenCalled();
    });

    it("rejects with 401 in production when authorization header token is invalid", async () => {
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "test-cron-secret";

      const request = new Request("https://example.com/api/cron/social-token-health", {
        headers: {
          authorization: "Bearer wrong-secret",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ success: false, error: "Unauthorized" });
      expect(checkAllVendorsSocialTokenHealth).not.toHaveBeenCalled();
    });

    it("rejects with 401 when CRON_SECRET is missing in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.CRON_SECRET;

      const request = new Request("https://example.com/api/cron/social-token-health", {
        headers: {
          authorization: "Bearer some-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(checkAllVendorsSocialTokenHealth).not.toHaveBeenCalled();
    });
  });

  describe("Successful Execution", () => {
    it("executes health check and returns 200 with summary when valid bearer token is provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "valid-cron-secret";

      vi.mocked(checkAllVendorsSocialTokenHealth).mockResolvedValueOnce({
        totalChecked: 10,
        healthyCount: 8,
        warningCount: 1,
        criticalCount: 1,
        refreshedCount: 2,
      });

      const request = new Request("https://example.com/api/cron/social-token-health", {
        headers: {
          authorization: "Bearer valid-cron-secret",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.summary.totalChecked).toBe(10);
      expect(json.summary.refreshedCount).toBe(2);
      expect(json.timestamp).toBeDefined();
      expect(checkAllVendorsSocialTokenHealth).toHaveBeenCalledTimes(1);
    });

    it("returns 500 when service throws an unexpected error", async () => {
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "valid-cron-secret";

      vi.mocked(checkAllVendorsSocialTokenHealth).mockRejectedValueOnce(
        new Error("Database connection lost"),
      );

      const request = new Request("https://example.com/api/cron/social-token-health", {
        headers: {
          authorization: "Bearer valid-cron-secret",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Internal Server Error during social token health check");
    });
  });
});
