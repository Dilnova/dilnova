import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Clerk
const mockAuth = vi.fn();
const mockGetOrganization = vi.fn();
const mockUpdateOrganization = vi.fn();
const mockClerkClient = vi.fn(() => ({
  organizations: {
    getOrganization: mockGetOrganization,
    updateOrganization: mockUpdateOrganization,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
  clerkClient: () => mockClerkClient(),
}));

// Mock rate limit
vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(undefined),
}));

// Mock vendor guard
const mockRequireVendorRole = vi.fn();
vi.mock("@/shared/auth/vendor-guard", () => ({
  requireVendorRole: (...args: unknown[]) => mockRequireVendorRole(...args),
}));

// Mock Cloudinary URL validation
const mockIsAllowedCloudinaryDeliveryUrl = vi.fn();
vi.mock("@/shared/media/cloudinary-url", () => ({
  isAllowedCloudinaryDeliveryUrl: (...args: unknown[]) =>
    mockIsAllowedCloudinaryDeliveryUrl(...args),
}));

// Mock Audit Logger
const mockLogAuditAction = vi.fn();
vi.mock("@/shared/audit/logger", () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
}));

// Mock Revalidate
const mockRevalidateVendorConsole = vi.fn();
vi.mock("@/features/vendor/revalidate", () => ({
  revalidateVendorConsole: () => mockRevalidateVendorConsole(),
}));

import { updateVendorMetadata, completeOrgOnboarding } from "@/features/vendor/actions";
import { ActionError } from "@/shared/errors/action-error";

describe("features/vendor/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth.mockResolvedValue({
      userId: "user_vendor_1",
      orgId: "org_123",
      orgRole: "org:admin",
    });

    mockRequireVendorRole.mockResolvedValue(undefined);
    mockIsAllowedCloudinaryDeliveryUrl.mockReturnValue(true);

    mockGetOrganization.mockResolvedValue({
      id: "org_123",
      name: "Organic Tea Estate",
      slug: "organic-tea",
      publicMetadata: {
        description: "Existing bio description",
        stockAllocationMode: "central_intake",
      },
      privateMetadata: {
        bankName: "Existing Bank",
        bankAccountNumber: "12345678",
      },
    });

    mockUpdateOrganization.mockResolvedValue({});
    mockLogAuditAction.mockResolvedValue(undefined);
  });

  describe("updateVendorMetadata", () => {
    const validData = {
      description: "Premium Ceylon tea straight from Nuwara Eliya",
      address: "123 High Street, Nuwara Eliya",
      phone: "+94771234567",
      bannerUrl:
        "https://res.cloudinary.com/test-cloud/image/upload/dilnova/vendors/org_123/banner.jpg",
      stockAllocationMode: "target_branch" as const,
      bankName: "National Bank",
      bankAccountName: "Tea Holdings LLC",
      bankAccountNumber: "9876543210",
      bankBranchCode: "001",
      bankTransferInstructions: "Please reference invoice number in remark.",
    };

    it("throws ActionError when validation fails (invalid organizationId)", async () => {
      await expect(updateVendorMetadata("", validData)).rejects.toThrow(ActionError);
    });

    it("throws ActionError when user is not signed in or lacks active org context", async () => {
      mockAuth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

      await expect(updateVendorMetadata("org_123", validData)).rejects.toThrow(
        "Not authorized: You do not belong to this organization.",
      );
    });

    it("throws ActionError on organization ID mismatch (cross-tenant isolation defense)", async () => {
      mockAuth.mockResolvedValue({
        userId: "user_vendor_1",
        orgId: "org_ATTACKER",
        orgRole: "org:admin",
      });

      await expect(updateVendorMetadata("org_VICTIM", validData)).rejects.toThrow(
        "Not authorized: You do not belong to this organization.",
      );
    });

    it("throws ActionError when requireVendorRole rejects (e.g. customer user)", async () => {
      mockRequireVendorRole.mockRejectedValue(
        new ActionError("Not authorized: Customers cannot perform vendor actions."),
      );

      await expect(updateVendorMetadata("org_123", validData)).rejects.toThrow(
        "Not authorized: Customers cannot perform vendor actions.",
      );
    });

    it("throws ActionError when banner image is outside vendor org folder", async () => {
      mockIsAllowedCloudinaryDeliveryUrl.mockImplementation(
        (_url: string, orgId?: string | null) => (orgId ? false : true),
      );

      await expect(updateVendorMetadata("org_123", validData)).rejects.toThrow(
        "Invalid banner image: The image must belong to your organization folder.",
      );
    });

    it("throws ActionError if user role is not org:admin or org:member", async () => {
      mockAuth.mockResolvedValue({
        userId: "user_vendor_1",
        orgId: "org_123",
        orgRole: "guest_reviewer",
      });

      await expect(updateVendorMetadata("org_123", validData)).rejects.toThrow(
        "Not authorized: You do not have permission to configure profile settings.",
      );
    });

    it("allows org:admin to update stockAllocationMode and private banking metadata", async () => {
      const res = await updateVendorMetadata("org_123", validData);

      expect(res).toEqual({ success: true });
      expect(mockUpdateOrganization).toHaveBeenCalledWith("org_123", {
        publicMetadata: {
          description: "Premium Ceylon tea straight from Nuwara Eliya",
          address: "123 High Street, Nuwara Eliya",
          phone: "+94771234567",
          bannerUrl:
            "https://res.cloudinary.com/test-cloud/image/upload/dilnova/vendors/org_123/banner.jpg",
          stockAllocationMode: "target_branch",
        },
        privateMetadata: {
          bankName: "National Bank",
          bankAccountName: "Tea Holdings LLC",
          bankAccountNumber: "9876543210",
          bankBranchCode: "001",
          bankTransferInstructions: "Please reference invoice number in remark.",
        },
      });

      expect(mockLogAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_vendor_1",
          action: "UPDATE_VENDOR_METADATA",
          targetType: "vendor",
          targetId: "org_123",
        }),
      );
      expect(mockRevalidateVendorConsole).toHaveBeenCalled();
    });

    it("restricts org:member: preserves existing stockAllocationMode and denies private banking metadata edits", async () => {
      mockAuth.mockResolvedValue({
        userId: "user_member_1",
        orgId: "org_123",
        orgRole: "org:member",
      });

      const memberAttemptedData = {
        ...validData,
        stockAllocationMode: "target_branch" as const, // attempts to change
        bankAccountNumber: "MEMBER-CHANGED-ACCOUNT", // attempts to change bank details
      };

      const res = await updateVendorMetadata("org_123", memberAttemptedData);

      expect(res).toEqual({ success: true });
      // Verify publicMetadata keeps the existing stockAllocationMode ("central_intake")
      // and privateMetadata keeps existing private bank details without changes
      expect(mockUpdateOrganization).toHaveBeenCalledWith("org_123", {
        publicMetadata: {
          description: "Premium Ceylon tea straight from Nuwara Eliya",
          address: "123 High Street, Nuwara Eliya",
          phone: "+94771234567",
          bannerUrl:
            "https://res.cloudinary.com/test-cloud/image/upload/dilnova/vendors/org_123/banner.jpg",
          stockAllocationMode: "central_intake", // Preserved from existingPublic
        },
        privateMetadata: {
          bankName: "Existing Bank",
          bankAccountNumber: "12345678", // Preserved from existingPrivate
        },
      });
    });

    it("tolerates slug lookup error during path revalidation without failing the operation", async () => {
      // First call succeeds for org metadata, second call fails when fetching slug
      mockGetOrganization
        .mockResolvedValueOnce({
          id: "org_123",
          publicMetadata: {},
          privateMetadata: {},
        })
        .mockRejectedValueOnce(new Error("Clerk API timeout"));

      const res = await updateVendorMetadata("org_123", validData);

      expect(res).toEqual({ success: true });
      expect(mockUpdateOrganization).toHaveBeenCalled();
    });
  });

  describe("completeOrgOnboarding", () => {
    it("throws ActionError when user is not signed in or not in org", async () => {
      mockAuth.mockResolvedValue({ userId: null, orgId: null, orgRole: null });

      await expect(completeOrgOnboarding("org_123")).rejects.toThrow(
        "Not authorized: You do not belong to this organization.",
      );
    });

    it("throws ActionError if caller is not an org:admin", async () => {
      mockAuth.mockResolvedValue({
        userId: "user_member_1",
        orgId: "org_123",
        orgRole: "org:member",
      });

      await expect(completeOrgOnboarding("org_123")).rejects.toThrow(
        "Not authorized: Only org admins can complete onboarding.",
      );
    });

    it("updates Clerk org publicMetadata marking onboardingCompleted as true", async () => {
      mockGetOrganization.mockResolvedValue({
        id: "org_123",
        publicMetadata: {
          tagline: "Eco-friendly goods",
        },
      });

      const res = await completeOrgOnboarding("org_123");

      expect(res).toEqual({ success: true });
      expect(mockUpdateOrganization).toHaveBeenCalledWith("org_123", {
        publicMetadata: {
          tagline: "Eco-friendly goods",
          onboardingCompleted: true,
        },
      });
      expect(mockRevalidateVendorConsole).toHaveBeenCalled();
    });
  });
});
