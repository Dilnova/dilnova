import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/cron/fx-rates/route";
import { syncLiveExchangeRates } from "@/shared/currency/exchange-rates.service";

vi.mock("@/shared/currency/exchange-rates.service", () => ({
  syncLiveExchangeRates: vi.fn(),
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GET /api/cron/fx-rates", () => {
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
      process.env.CRON_SECRET = "super-secret-cron-token";

      const request = new Request("https://example.com/api/cron/fx-rates");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "Unauthorized" });
      expect(syncLiveExchangeRates).not.toHaveBeenCalled();
    });

    it("rejects with 401 in production when authorization header token is invalid", async () => {
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "super-secret-cron-token";

      const request = new Request("https://example.com/api/cron/fx-rates", {
        headers: {
          authorization: "Bearer wrong-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "Unauthorized" });
      expect(syncLiveExchangeRates).not.toHaveBeenCalled();
    });

    it("rejects with 401 in production when CRON_SECRET is missing from environment", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.CRON_SECRET;

      const request = new Request("https://example.com/api/cron/fx-rates", {
        headers: {
          authorization: "Bearer any-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: "Unauthorized" });
      expect(syncLiveExchangeRates).not.toHaveBeenCalled();
    });

    it("rejects with 401 in non-production when CRON_SECRET is set but header does not match", async () => {
      process.env.NODE_ENV = "development";
      process.env.CRON_SECRET = "dev-secret-token";

      const request = new Request("https://example.com/api/cron/fx-rates", {
        headers: {
          authorization: "Bearer incorrect-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(syncLiveExchangeRates).not.toHaveBeenCalled();
    });
  });

  describe("Successful Execution", () => {
    it("executes sync and returns 200 when valid bearer token is provided", async () => {
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "super-secret-cron-token";

      vi.mocked(syncLiveExchangeRates).mockResolvedValueOnce({
        success: true,
        updatedCount: 5,
        baseCurrency: "USD",
        rates: { EUR: 0.92 },
      });

      const request = new Request("https://example.com/api/cron/fx-rates", {
        headers: {
          authorization: "Bearer super-secret-cron-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.updatedCount).toBe(5);
      expect(json.timestamp).toBeDefined();
      expect(syncLiveExchangeRates).toHaveBeenCalledTimes(1);
    });

    it("returns 500 when service throws an unexpected error", async () => {
      process.env.NODE_ENV = "production";
      process.env.CRON_SECRET = "super-secret-cron-token";

      vi.mocked(syncLiveExchangeRates).mockRejectedValueOnce(new Error("External API failure"));

      const request = new Request("https://example.com/api/cron/fx-rates", {
        headers: {
          authorization: "Bearer super-secret-cron-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Internal Server Error during FX rate sync");
    });
  });
});
