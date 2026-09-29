import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/locations/route";
import { rateLimit } from "@/shared/security/rate-limit";

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/shared/security/http-client", () => ({
  HTTP_TIMEOUT: {
    FAST: 4000,
    DEFAULT: 8000,
    EXTENDED: 15000,
  },
  fetchWithTimeout: vi.fn((url: string) => {
    if (url.includes("nominatim.openstreetmap.org/reverse")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            address: {
              country: "Sri Lanka",
              state: "Western Province",
              city: "Colombo",
              road: "Galle Road",
              house_number: "100",
              postcode: "00300",
            },
          }),
      });
    }

    if (url.includes("ipapi.co")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            country_name: "Sri Lanka",
            region: "Western",
            city: "Colombo",
            postal: "00100",
          }),
      });
    }

    return Promise.resolve({
      ok: false,
      status: 500,
    });
  }),
}));

describe("GET /api/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Security: Rate Limiting & Validation", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      vi.mocked(rateLimit).mockRejectedValueOnce(
        new Error("Rate limit exceeded. Please try again in 45 seconds."),
      );

      const req = new Request("http://localhost:3000/api/locations?type=countries");
      const res = await GET(req);

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("60");
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: "Too many location requests. Please try again shortly.",
      });
    });

    it("rejects invalid request types with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/locations?type=unsupported-type");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid location request parameters");
    });

    it("applies heavier rate limit tier for geocoding operations", async () => {
      const req = new Request(
        "http://localhost:3000/api/locations?type=reverse-geocode&lat=6.9271&lon=79.8612",
        {
          headers: { "x-real-ip": "203.0.113.195" },
        },
      );

      await GET(req);

      expect(rateLimit).toHaveBeenCalledWith(15, 60 * 1000, "locations:geo:203.0.113.195");
    });

    it("applies standard rate limit tier for catalog queries", async () => {
      const req = new Request("http://localhost:3000/api/locations?type=countries", {
        headers: { "x-real-ip": "203.0.113.195" },
      });

      await GET(req);

      expect(rateLimit).toHaveBeenCalledWith(60, 60 * 1000, "locations:catalog:203.0.113.195");
    });
  });

  describe("Countries lookup", () => {
    it("returns sorted countries list with cache-control headers by default", async () => {
      const req = new Request("http://localhost:3000/api/locations");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("public");
      expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(50);
      expect(json.data[0]).toHaveProperty("code");
      expect(json.data[0]).toHaveProperty("name");
    });
  });

  describe("States lookup", () => {
    it("returns states for a valid country", async () => {
      const req = new Request("http://localhost:3000/api/locations?type=states&country=LK");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });
  });

  describe("Reverse Geocoding", () => {
    it("returns address details with private non-cacheable headers", async () => {
      const req = new Request(
        "http://localhost:3000/api/locations?type=reverse-geocode&lat=6.9271&lon=79.8612",
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-cache, no-store, must-revalidate");

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.country).toBe("Sri Lanka");
      expect(json.data.city).toBe("Colombo");
    });

    it("rejects out-of-bounds latitude coordinates with 400", async () => {
      const req = new Request(
        "http://localhost:3000/api/locations?type=reverse-geocode&lat=120.0&lon=79.8612",
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid coordinates");
    });
  });

  describe("IP Location fallback", () => {
    it("returns geolocated IP address info with private non-cacheable headers", async () => {
      const req = new Request("http://localhost:3000/api/locations?type=ip-location", {
        headers: { "x-forwarded-for": "198.51.100.2" },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-cache, no-store, must-revalidate");

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.country).toBe("Sri Lanka");
      expect(json.data.city).toBe("Colombo");
    });
  });
});
