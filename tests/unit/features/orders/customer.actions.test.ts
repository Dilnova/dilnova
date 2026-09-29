import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPaymentSlipUploadPresignedUrlAction,
  submitPaymentSlipPathAction,
} from "@/features/orders/customer.actions";

vi.mock("@/shared/storage/admin-client", () => ({
  isSupabaseStorageConfigured: vi.fn(() => false),
}));

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/security/async-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/security/async-context")>();
  return {
    ...actual,
    runWithCorrelationId: vi.fn((fn: () => unknown) => fn()),
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "user_test_123",
    orgId: null,
    orgRole: null,
    sessionClaims: {},
  }),
  currentUser: vi.fn().mockResolvedValue({
    id: "user_test_123",
    emailAddresses: [{ emailAddress: "customer@example.com" }],
  }),
}));

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

describe("Customer safe actions error handling (§5 API Readiness)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPaymentSlipUploadPresignedUrlAction returns serverError when storage is unconfigured", async () => {
    const result = await createPaymentSlipUploadPresignedUrlAction({
      orderId: "a0000000-0000-0000-0000-000000000001",
      fileName: "slip.png",
      fileSize: 1024,
      fileType: "image/png",
    });

    // Should return next-safe-action serverError without manual { success: false } in data
    expect(result.data).toBeUndefined();
    expect(result.serverError).toBe("Payment slip storage is not configured. Contact support.");
  });

  it("submitPaymentSlipPathAction returns serverError when storage is unconfigured", async () => {
    const result = await submitPaymentSlipPathAction({
      orderId: "a0000000-0000-0000-0000-000000000001",
      storagePath: "orders/a0000000-0000-0000-0000-000000000001/slip.png",
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBe("Payment slip storage is not configured. Contact support.");
  });

  it("createPaymentSlipUploadPresignedUrlAction validates empty file size", async () => {
    const result = await createPaymentSlipUploadPresignedUrlAction({
      orderId: "a0000000-0000-0000-0000-000000000001",
      fileName: "slip.png",
      fileSize: 0,
      fileType: "image/png",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
  });
});
