import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRedisGet,
  mockRedisSet,
  mockRedisDel,
  mockGetUser,
  mockDeleteUser,
  mockOrders,
  mockContactSubmissions,
  updatedOrderPayloads,
  deletedContactIds,
} = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
  mockRedisDel: vi.fn(),
  mockGetUser: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockOrders: [] as Array<{
    id: string;
    customerUserId: string | null;
    customerEmailHash: string | null;
    paymentSlipUrl: string | null;
  }>,
  mockContactSubmissions: [] as Array<{ id: string; email: string; emailHash: string | null }>,
  updatedOrderPayloads: [] as unknown[],
  deletedContactIds: [] as unknown[],
}));

// Mock QStash signature verification to invoke handler directly
vi.mock("@upstash/qstash/nextjs", () => ({
  verifySignatureAppRouter: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      get = mockRedisGet;
      set = mockRedisSet;
      del = mockRedisDel;
    },
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn().mockResolvedValue({
    users: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    },
  }),
}));

// Mock Audit Logger & Logger
vi.mock("@/shared/audit/logger", () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/shared/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

interface MockTx {
  select: (fields?: { id?: unknown; email?: unknown }) => {
    from: () => {
      then: (
        resolve: (val: unknown) => unknown,
        reject?: (err: unknown) => unknown,
      ) => Promise<unknown>;
      where: () => Promise<unknown>;
    };
  };
  update: () => {
    set: (payload: unknown) => {
      where: () => Promise<unknown[]>;
    };
  };
  delete: () => {
    where: (cond: unknown) => Promise<unknown[]>;
  };
  insert: () => {
    values: () => Promise<unknown[]>;
  };
}

vi.mock("@/shared/db/client", () => {
  return {
    db: {
      transaction: async (cb: (tx: MockTx) => Promise<unknown>) => {
        const tx: MockTx = {
          select: vi.fn((fields?: { id?: unknown; email?: unknown }) => ({
            from: vi.fn(() => {
              const res = fields?.id && fields?.email ? mockContactSubmissions : mockOrders;
              return {
                then: (resolve: (val: unknown) => unknown, reject?: (err: unknown) => unknown) =>
                  Promise.resolve(res).then(resolve, reject),
                where: vi.fn(async () => res),
              };
            }),
          })),
          update: vi.fn(() => ({
            set: vi.fn((payload: unknown) => {
              updatedOrderPayloads.push(payload);
              return {
                where: vi.fn().mockResolvedValue([]),
              };
            }),
          })),
          delete: vi.fn(() => ({
            where: vi.fn((cond: unknown) => {
              deletedContactIds.push(cond);
              return Promise.resolve([]);
            }),
          })),
          insert: vi.fn(() => ({
            values: vi.fn().mockResolvedValue([]),
          })),
        };
        return cb(tx);
      },
    },
  };
});

import { POST } from "@/app/api/webhooks/qstash/erase/route";
import { hashPii } from "@/shared/security/encryption";

describe("POST /api/webhooks/qstash/erase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrders.length = 0;
    mockContactSubmissions.length = 0;
    updatedOrderPayloads.length = 0;
    deletedContactIds.length = 0;

    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockRedisDel.mockResolvedValue(1);

    mockGetUser.mockResolvedValue({
      id: "user_to_erase_123",
      emailAddresses: [{ emailAddress: "customer@example.com" }],
      publicMetadata: {},
    });
    mockDeleteUser.mockResolvedValue({});
  });

  it("rejects request if missing upstash-message-id", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/qstash/erase", {
      method: "POST",
      body: JSON.stringify({ targetUserId: "user_to_erase_123", adminUserId: "admin_1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing upstash-message-id");
  });

  it("nullifies customerEmailHash when anonymizing orders", async () => {
    const email = "customer@example.com";
    const emailHash = hashPii(email);

    mockOrders.push({
      id: "order_1",
      customerUserId: "user_to_erase_123",
      customerEmailHash: emailHash,
      paymentSlipUrl: null,
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/qstash/erase", {
      method: "POST",
      headers: {
        "upstash-message-id": "msg_test_001",
      },
      body: JSON.stringify({ targetUserId: "user_to_erase_123", adminUserId: "admin_1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify order update payload has customerEmailHash: null
    expect(updatedOrderPayloads.length).toBeGreaterThan(0);
    const orderUpdate = updatedOrderPayloads[0] as Record<string, unknown>;
    expect(orderUpdate.customerEmailHash).toBeNull();
    expect(orderUpdate.customerUserId).toBeNull();
    expect(orderUpdate.customerEmail).toBe("redacted@example.com");
    expect(orderUpdate.customerName).toBe("GDPR REDACTED");
  });

  it("deletes contact submissions matching user email and blind index hash", async () => {
    const email = "customer@example.com";
    const emailHash = hashPii(email);

    mockContactSubmissions.push(
      { id: "sub_1", email: "customer@example.com", emailHash },
      { id: "sub_2", email: "other@example.com", emailHash: "other_hash" },
    );

    const req = new NextRequest("http://localhost:3000/api/webhooks/qstash/erase", {
      method: "POST",
      headers: {
        "upstash-message-id": "msg_test_002",
      },
      body: JSON.stringify({ targetUserId: "user_to_erase_123", adminUserId: "admin_1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(deletedContactIds.length).toBeGreaterThan(0);
  });
});
