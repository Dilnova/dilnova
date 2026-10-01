import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/shipping/label-pdf/route";
import { shipments, simulatedOrders } from "@/shared/db/schema";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetCachedIsSuperAdmin = vi.fn();
vi.mock("@/shared/auth/clerk-cache", () => ({
  getCachedIsSuperAdmin: (userId: string) => mockGetCachedIsSuperAdmin(userId),
}));

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

let mockShipmentRows: Record<string, unknown>[] = [];
let mockOrderRows: Record<string, unknown>[] = [];

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            if (table === shipments) {
              return Promise.resolve(mockShipmentRows);
            }
            if (table === simulatedOrders) {
              return Promise.resolve(mockOrderRows);
            }
            return Promise.resolve([]);
          }),
        })),
      })),
    })),
  },
}));

describe("GET /api/shipping/label-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShipmentRows = [];
    mockOrderRows = [];
    mockGetCachedIsSuperAdmin.mockResolvedValue(false);
  });

  it("returns 401 Unauthorized when request is unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null });

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=TRACK123");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when tracking number is missing or invalid format", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123", orgId: "org_123" });

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=bad!track$#%");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid or missing tracking number");
  });

  it("returns 404 when shipment is not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123", orgId: "org_123" });
    mockShipmentRows = [];

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=TRACK123");
    const res = await GET(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Shipment not found");
  });

  it("returns 404 when order is not found for the shipment", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123", orgId: "org_vendor_1" });
    mockShipmentRows = [
      {
        id: "ship_1",
        orderId: "order_1",
        vendorOrgId: "org_vendor_1",
        trackingNumber: "TRACK123",
      },
    ];
    mockOrderRows = [];

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=TRACK123");
    const res = await GET(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 403 Forbidden when caller is neither vendor, owning customer, nor superadmin", async () => {
    mockAuth.mockResolvedValue({ userId: "user_attacker", orgId: "org_other" });
    mockShipmentRows = [
      {
        id: "ship_1",
        orderId: "order_1",
        vendorOrgId: "org_vendor_victim",
        trackingNumber: "TRACK123",
      },
    ];
    mockOrderRows = [
      {
        id: "order_1",
        customerUserId: "user_customer_victim",
        customerName: "John Doe",
      },
    ];
    mockGetCachedIsSuperAdmin.mockResolvedValue(false);

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=TRACK123");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  it("returns 200 HTML label when caller is the shipment vendor org member", async () => {
    mockAuth.mockResolvedValue({ userId: "user_vendor", orgId: "org_vendor_1" });
    mockShipmentRows = [
      {
        id: "ship_1",
        orderId: "order_1",
        vendorOrgId: "org_vendor_1",
        trackingNumber: "TRACK123",
        carrierName: "Dilnova Express",
        shippingZone: "DOMESTIC",
        weightGrams: 500,
      },
    ];
    mockOrderRows = [
      {
        id: "order_1",
        customerUserId: "user_customer_1",
        customerName: "Jane Doe",
        shippingAddress: "123 Main St",
        shippingCity: "Colombo",
        shippingCountry: "LK",
      },
    ];

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=TRACK123");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("TRACK123");
    expect(html).toContain("Jane Doe");
  });

  it("returns 200 HTML label when caller is the order customer", async () => {
    mockAuth.mockResolvedValue({ userId: "user_customer_1", orgId: null });
    mockShipmentRows = [
      {
        id: "ship_1",
        orderId: "order_1",
        vendorOrgId: "org_vendor_1",
        trackingNumber: "TRACK123",
        carrierName: "Dilnova Express",
        shippingZone: "DOMESTIC",
        weightGrams: 500,
      },
    ];
    mockOrderRows = [
      {
        id: "order_1",
        customerUserId: "user_customer_1",
        customerName: "Jane Doe",
        shippingAddress: "123 Main St",
        shippingCity: "Colombo",
        shippingCountry: "LK",
      },
    ];

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=TRACK123");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("TRACK123");
    expect(html).toContain("Jane Doe");
  });

  it("returns 200 HTML label when caller is superadmin", async () => {
    mockAuth.mockResolvedValue({ userId: "user_superadmin", orgId: null });
    mockGetCachedIsSuperAdmin.mockResolvedValue(true);

    mockShipmentRows = [
      {
        id: "ship_1",
        orderId: "order_1",
        vendorOrgId: "org_vendor_1",
        trackingNumber: "TRACK123",
        carrierName: "Dilnova Express",
        shippingZone: "DOMESTIC",
        weightGrams: 500,
      },
    ];
    mockOrderRows = [
      {
        id: "order_1",
        customerUserId: "user_customer_victim",
        customerName: "Victim Customer",
        shippingAddress: "123 Main St",
        shippingCity: "Colombo",
        shippingCountry: "LK",
      },
    ];

    const req = new Request("https://example.com/api/shipping/label-pdf?tracking=TRACK123");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("TRACK123");
    expect(html).toContain("Victim Customer");
  });
});
