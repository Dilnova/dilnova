import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/chat/messages/[conversationId]/route";
import { NextRequest } from "next/server";
import { orderConversations } from "@/shared/db/schema";
import { listMessages } from "@/features/chat/queries";
import { logger } from "@/shared/logging/logger";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/features/chat/queries", () => ({
  listMessages: vi.fn(),
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

let mockConversationRows: Record<string, unknown>[] = [];
let mockBranchMemberRows: Record<string, unknown>[] = [];

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table) => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            if (table === orderConversations) {
              return Promise.resolve(mockConversationRows);
            }
            return Promise.resolve(mockBranchMemberRows);
          }),
        })),
      })),
    })),
  },
}));

describe("GET /api/chat/messages/[conversationId]", () => {
  const validUuid = "12345678-1234-1234-1234-123456789abc";

  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationRows = [];
    mockBranchMemberRows = [];
  });

  it("rejects invalid non-UUID conversation ID with 400 Bad Request", async () => {
    const req = new NextRequest(`https://example.com/api/chat/messages/not-a-valid-uuid`);
    const res = await GET(req, {
      params: Promise.resolve({ conversationId: "not-a-valid-uuid" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid conversation ID format");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

    const req = new NextRequest(`https://example.com/api/chat/messages/${validUuid}`);
    const res = await GET(req, {
      params: Promise.resolve({ conversationId: validUuid }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when conversation does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_customer_1", orgId: null, orgRole: null });
    mockConversationRows = [];

    const req = new NextRequest(`https://example.com/api/chat/messages/${validUuid}`);
    const res = await GET(req, {
      params: Promise.resolve({ conversationId: validUuid }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Conversation not found");
  });

  it("returns 403 when caller is not the customer nor the vendor", async () => {
    mockAuth.mockResolvedValue({
      userId: "user_attacker",
      orgId: "org_attacker",
      orgRole: "org:member",
    });
    mockConversationRows = [
      {
        id: validUuid,
        customerUserId: "user_victim",
        orgId: "org_victim_vendor",
      },
    ];

    const req = new NextRequest(`https://example.com/api/chat/messages/${validUuid}`);
    const res = await GET(req, {
      params: Promise.resolve({ conversationId: validUuid }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 and caps message limit to 100 for authorized customer", async () => {
    mockAuth.mockResolvedValue({ userId: "user_customer_1", orgId: null, orgRole: null });
    mockConversationRows = [
      {
        id: validUuid,
        customerUserId: "user_customer_1",
        orgId: "org_vendor_1",
      },
    ];
    vi.mocked(listMessages).mockResolvedValue([]);

    const req = new NextRequest(`https://example.com/api/chat/messages/${validUuid}?limit=99999`);
    const res = await GET(req, {
      params: Promise.resolve({ conversationId: validUuid }),
    });

    expect(res.status).toBe(200);
    expect(listMessages).toHaveBeenCalledWith(validUuid, expect.objectContaining({ limit: 100 }));
  });

  it("handles unexpected database errors with generic 500 without leaking stack traces", async () => {
    mockAuth.mockResolvedValue({ userId: "user_customer_1", orgId: null, orgRole: null });
    mockConversationRows = [
      {
        id: validUuid,
        customerUserId: "user_customer_1",
        orgId: "org_vendor_1",
      },
    ];
    const dbErr = new Error("FATAL: connection terminated unexpectedly");
    vi.mocked(listMessages).mockRejectedValue(dbErr);

    const req = new NextRequest(`https://example.com/api/chat/messages/${validUuid}`);
    const res = await GET(req, {
      params: Promise.resolve({ conversationId: validUuid }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal Server Error");
    expect(logger.error).toHaveBeenCalledWith("[GET /api/chat/messages] Error", dbErr);
  });
});
