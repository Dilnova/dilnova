import { describe, it, expect, vi, beforeEach } from "vitest";
import CustomerTrackPage from "@/app/(customer)/customer/track/[orderId]/page";
import { shipments, simulatedOrders } from "@/shared/db/schema";
import { redirect, notFound } from "next/navigation";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetCachedIsSuperAdmin = vi.fn();
vi.mock("@/shared/auth/clerk-cache", () => ({
  getCachedIsSuperAdmin: (userId: string) => mockGetCachedIsSuperAdmin(userId),
}));

let mockShipmentRows: Record<string, unknown>[] = [];
let mockOrderRows: Record<string, unknown>[] = [];

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            if (table === simulatedOrders) {
              return Promise.resolve(mockOrderRows);
            }
            if (table === shipments) {
              return Promise.resolve(mockShipmentRows);
            }
            return Promise.resolve([]);
          }),
        })),
      })),
    })),
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

describe("CustomerTrackPage Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShipmentRows = [];
    mockOrderRows = [];
    mockGetCachedIsSuperAdmin.mockResolvedValue(false);
  });

  it("redirects unauthenticated users to /sign-in", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    await expect(
      CustomerTrackPage({ params: Promise.resolve({ orderId: "order_123" }) }),
    ).rejects.toThrow("REDIRECT:/sign-in");

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("calls notFound when order does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_customer_1" });
    mockOrderRows = [];

    await expect(
      CustomerTrackPage({ params: Promise.resolve({ orderId: "order_nonexistent" }) }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound when customer does not own the order", async () => {
    mockAuth.mockResolvedValue({ userId: "user_attacker" });
    mockOrderRows = [
      {
        id: "order_victim",
        customerUserId: "user_victim",
        status: "shipped",
      },
    ];
    mockGetCachedIsSuperAdmin.mockResolvedValue(false);

    await expect(
      CustomerTrackPage({ params: Promise.resolve({ orderId: "order_victim" }) }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  it("renders order tracking when customer owns the order", async () => {
    mockAuth.mockResolvedValue({ userId: "user_owner" });
    mockOrderRows = [
      {
        id: "order_owner_123",
        customerUserId: "user_owner",
        status: "shipped",
        carrierName: "Dilnova Express",
        trackingNumber: "TRK12345",
      },
    ];
    mockShipmentRows = [
      {
        orderId: "order_owner_123",
        trackingNumber: "TRK12345",
        carrierName: "Dilnova Express",
        shippingService: "standard",
        events: [],
      },
    ];

    const result = await CustomerTrackPage({
      params: Promise.resolve({ orderId: "order_owner_123" }),
    });

    expect(result).toBeDefined();
    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("allows superadmin to view order tracking even if not the owner", async () => {
    mockAuth.mockResolvedValue({ userId: "user_superadmin" });
    mockGetCachedIsSuperAdmin.mockResolvedValue(true);
    mockOrderRows = [
      {
        id: "order_victim_456",
        customerUserId: "user_victim",
        status: "fulfilled",
        carrierName: "Dilnova Express",
        trackingNumber: "TRK99999",
      },
    ];
    mockShipmentRows = [];

    const result = await CustomerTrackPage({
      params: Promise.resolve({ orderId: "order_victim_456" }),
    });

    expect(result).toBeDefined();
    expect(notFound).not.toHaveBeenCalled();
  });
});
