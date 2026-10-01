import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/shipping/rates/route";
import { rateLimit } from "@/shared/security/rate-limit";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/shared/shipping/rate-engine", () => ({
  computeMultiVendorRates: vi.fn(() =>
    Promise.resolve({
      quotes: [
        {
          vendorOrgId: "org_vendor_1",
          originBranchId: "branch_1",
          originBranchName: "Main Colombo Branch",
          rates: [
            {
              id: "slpost-standard",
              carrierId: "slpost",
              carrierName: "Sri Lanka Post",
              serviceName: "Registered Post",
              amountCents: 350,
              estimatedDays: 3,
            },
          ],
          selectedRate: {
            id: "slpost-standard",
            carrierId: "slpost",
            carrierName: "Sri Lanka Post",
            serviceName: "Registered Post",
            amountCents: 350,
            estimatedDays: 3,
          },
          totalCents: 350,
          originCity: "Colombo",
          originState: "Western",
        },
      ],
      totalShippingCents: 350,
    }),
  ),
}));

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
}));

describe("/api/shipping/rates API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/shipping/rates", () => {
    it("returns 405 Method Not Allowed", async () => {
      const res = await GET();
      expect(res.status).toBe(405);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Method Not Allowed");
      expect(res.headers.get("Allow")).toBe("POST");
    });
  });

  describe("POST /api/shipping/rates - Authentication & Access Control", () => {
    it("returns 401 Unauthorized when user is not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });

      const req = new Request("http://localhost:3000/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [{ id: "prod_1", quantity: 2 }],
          destinationAddress: { street: "123 Galle Rd", city: "Colombo" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Unauthorized");
    });
  });

  describe("POST /api/shipping/rates - Rate Limiting", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "user_customer_123" });
      vi.mocked(rateLimit).mockRejectedValueOnce(
        new Error("Rate limit exceeded. Please try again in 30 seconds."),
      );

      const req = new Request("http://localhost:3000/api/shipping/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "198.51.100.5",
        },
        body: JSON.stringify({
          cartItems: [{ id: "prod_1", quantity: 2 }],
          destinationAddress: { street: "123 Galle Rd", city: "Colombo" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("60");
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Too many shipping rate requests");
    });

    it("enforces both user-level and IP-level rate limits", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "user_customer_123" });

      const req = new Request("http://localhost:3000/api/shipping/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "198.51.100.5",
        },
        body: JSON.stringify({
          cartItems: [{ id: "prod_1", quantity: 2 }],
          destinationAddress: { street: "123 Galle Rd", city: "Colombo" },
        }),
      });

      await POST(req);

      expect(rateLimit).toHaveBeenCalledWith(
        20,
        60 * 1000,
        "shipping-rates:user:user_customer_123",
        { failClosed: true },
      );
      expect(rateLimit).toHaveBeenCalledWith(30, 60 * 1000, "shipping-rates:ip:198.51.100.5", {
        failClosed: true,
      });
    });
  });

  describe("POST /api/shipping/rates - Input Validation", () => {
    it("returns 400 Bad Request when cartItems is empty", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "user_customer_123" });

      const req = new Request("http://localhost:3000/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [],
          destinationAddress: { street: "123 Galle Rd", city: "Colombo" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("returns 400 Bad Request when cartItems quantity is zero or negative", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "user_customer_123" });

      const req = new Request("http://localhost:3000/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [{ id: "prod_1", quantity: -1 }],
          destinationAddress: { street: "123 Galle Rd", city: "Colombo" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 Bad Request when destination city or street is missing", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "user_customer_123" });

      const req = new Request("http://localhost:3000/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [{ id: "prod_1", quantity: 1 }],
          destinationAddress: { street: "", city: "" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/shipping/rates - Successful Rate Calculation", () => {
    it("calculates rates successfully with private non-cacheable headers", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "user_customer_123" });

      const req = new Request("http://localhost:3000/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [
            {
              id: "prod_1",
              quantity: 2,
              weightGrams: 500,
              vendorOrgId: "org_vendor_1",
            },
          ],
          destinationAddress: {
            street: "123 Galle Road",
            city: "Colombo",
            postalCode: "00300",
            country: "LK",
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-cache, no-store, must-revalidate");

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalShippingCents).toBe(350);
      expect(json.data.quotes.length).toBe(1);
    });
  });
});
