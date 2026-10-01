import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/chat/conversations/route";
import { NextRequest } from "next/server";
import { listOrgConversations, listCustomerConversations } from "@/features/chat/queries";
import { logger } from "@/shared/logging/logger";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/features/chat/queries", () => ({
  listOrgConversations: vi.fn(),
  listCustomerConversations: vi.fn(),
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("GET /api/chat/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 Unauthorized when user is not logged in", async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    const req = new NextRequest("https://example.com/api/chat/conversations");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("clamps limit to 100 max and offset to 0 min in vendor mode", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_vendor_1",
      orgId: "org_1",
      orgRole: "org:admin",
    });

    vi.mocked(listOrgConversations).mockResolvedValue({
      conversations: [],
      totalCount: 0,
    });

    const req = new NextRequest(
      "https://example.com/api/chat/conversations?limit=99999&offset=-50",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(listOrgConversations).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({
        limit: 100, // Capped at 100
        offset: 0, // Clamped to min 0
      }),
    );
  });

  it("returns generic error message on database failure without leaking stack trace or schema", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_customer_1",
      orgId: null,
      orgRole: null,
    });

    const internalDatabaseError = new Error(
      'relation "simulated_orders" column "customer_secret" does not exist in schema pg_catalog',
    );
    vi.mocked(listCustomerConversations).mockRejectedValue(internalDatabaseError);

    const req = new NextRequest("https://example.com/api/chat/conversations");
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch conversations");
    expect(body.error).not.toContain("simulated_orders");
    expect(body.error).not.toContain("pg_catalog");
    expect(logger.error).toHaveBeenCalledWith(
      "[GET /api/chat/conversations] Error",
      internalDatabaseError,
    );
  });
});
