import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPaymentSlipUploadPresignedUrlAction,
  submitPaymentSlipPathAction,
} from "@/features/orders/customer.actions";
import { isSupabaseStorageConfigured } from "@/shared/storage/admin-client";

const {
  deletePaymentSlipFromStorageMock,
  verifyPaymentSlipFileExistsMock,
  verifyPaymentSlipMagicBytesMock,
  createPaymentSlipSignedUrlMock,
  selectLimitMock,
  updateWhereMock,
} = vi.hoisted(() => ({
  deletePaymentSlipFromStorageMock: vi.fn(),
  verifyPaymentSlipFileExistsMock: vi.fn(),
  verifyPaymentSlipMagicBytesMock: vi.fn(),
  createPaymentSlipSignedUrlMock: vi.fn(),
  selectLimitMock: vi.fn(),
  updateWhereMock: vi.fn(),
}));

vi.mock("@/shared/storage/admin-client", () => ({
  isSupabaseStorageConfigured: vi.fn(() => false),
}));

vi.mock("@/shared/storage/payment-slip", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/storage/payment-slip")>();
  return {
    ...actual,
    deletePaymentSlipFromStorage: deletePaymentSlipFromStorageMock,
    verifyPaymentSlipFileExists: verifyPaymentSlipFileExistsMock,
    verifyPaymentSlipMagicBytes: verifyPaymentSlipMagicBytesMock,
    createPaymentSlipSignedUrl: createPaymentSlipSignedUrlMock,
  };
});

vi.mock("@/shared/audit/logger", () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/orders/email/payment-slip", () => ({
  sendPaymentSlipUploadedNotifications: vi
    .fn()
    .mockResolvedValue({ success: true, notifiedCount: 1 }),
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
          limit: selectLimitMock,
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: updateWhereMock,
      }),
    }),
  },
}));

describe("Customer safe actions error handling (§5 API Readiness)", () => {
  const orderId = "a0000000-0000-0000-0000-000000000001";
  const validStoragePath = `orders/${orderId}/b0000000-0000-0000-0000-000000000002.png`;

  const mockOrder = {
    id: orderId,
    customerUserId: "user_test_123",
    customerEmail: "customer@example.com",
    paymentMethod: "bank_transfer",
    status: "pending_payment",
    totalAmount: 5000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseStorageConfigured).mockReturnValue(false);
    selectLimitMock.mockResolvedValue([]);
    updateWhereMock.mockResolvedValue([mockOrder]);
    deletePaymentSlipFromStorageMock.mockResolvedValue(true);
    verifyPaymentSlipFileExistsMock.mockResolvedValue(true);
    verifyPaymentSlipMagicBytesMock.mockResolvedValue(true);
    createPaymentSlipSignedUrlMock.mockResolvedValue("https://storage.supabase.co/preview.png");
  });

  it("createPaymentSlipUploadPresignedUrlAction returns serverError when storage is unconfigured", async () => {
    const result = await createPaymentSlipUploadPresignedUrlAction({
      orderId,
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
      orderId,
      storagePath: validStoragePath,
    });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBe("Payment slip storage is not configured. Contact support.");
  });

  it("createPaymentSlipUploadPresignedUrlAction validates empty file size", async () => {
    const result = await createPaymentSlipUploadPresignedUrlAction({
      orderId,
      fileName: "slip.png",
      fileSize: 0,
      fileType: "image/png",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
  });

  describe("Magic bytes validation and auto-purge (Finding 13.1)", () => {
    beforeEach(() => {
      vi.mocked(isSupabaseStorageConfigured).mockReturnValue(true);
      selectLimitMock.mockResolvedValue([mockOrder]);
    });

    it("auto-deletes file from storage and rejects when magic bytes verification fails", async () => {
      verifyPaymentSlipFileExistsMock.mockResolvedValueOnce(true);
      verifyPaymentSlipMagicBytesMock.mockResolvedValueOnce(false);

      const result = await submitPaymentSlipPathAction({
        orderId,
        storagePath: validStoragePath,
      });

      expect(result.data).toBeUndefined();
      expect(result.serverError).toBe(
        "Uploaded file appears to be corrupted or is not a valid image format.",
      );
      expect(deletePaymentSlipFromStorageMock).toHaveBeenCalledTimes(1);
      expect(deletePaymentSlipFromStorageMock).toHaveBeenCalledWith(validStoragePath);
      expect(updateWhereMock).not.toHaveBeenCalled();
    });

    it("completes status transition without deleting file when magic bytes verification succeeds", async () => {
      verifyPaymentSlipFileExistsMock.mockResolvedValueOnce(true);
      verifyPaymentSlipMagicBytesMock.mockResolvedValueOnce(true);

      const result = await submitPaymentSlipPathAction({
        orderId,
        storagePath: validStoragePath,
      });

      expect(result.serverError).toBeUndefined();
      expect(result.data?.success).toBe(true);
      expect(result.data?.previewUrl).toBe("https://storage.supabase.co/preview.png");
      expect(deletePaymentSlipFromStorageMock).not.toHaveBeenCalled();
      expect(updateWhereMock).toHaveBeenCalledTimes(1);
    });
  });
});
