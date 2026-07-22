import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOrganizationMemberRole } from "@/features/admin/actions";
import { rateLimit } from "@/shared/security/rate-limit";
import { auth, clerkClient } from "@clerk/nextjs/server";

vi.mock("@/shared/security/rate-limit", () => ({
  rateLimit: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/shared/audit/logger", () => ({
  logAuditAction: vi.fn(() => Promise.resolve()),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

describe("updateOrganizationMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls rateLimit and updates membership role successfully", async () => {
    const mockAuth = auth as any;
    mockAuth.mockResolvedValue({
      orgId: "org_123",
      orgRole: "org:admin",
      userId: "user_caller",
    });

    const mockGetOrganizationMembershipList = vi.fn().mockResolvedValue({
      data: [
        {
          role: "org:admin",
          publicUserData: { userId: "user_target" },
        },
        {
          role: "org:admin",
          publicUserData: { userId: "other_user" },
        },
      ],
    });
    const mockUpdateOrganizationMembership = vi.fn().mockResolvedValue({});
    const mockClerkClient = clerkClient as any;
    mockClerkClient.mockResolvedValue({
      organizations: {
        getOrganizationMembershipList: mockGetOrganizationMembershipList,
        updateOrganizationMembership: mockUpdateOrganizationMembership,
      },
    });

    const res = await updateOrganizationMemberRole("org_123", "user_target", "org:member");

    expect(res).toEqual({ success: true });
    expect(rateLimit).toHaveBeenCalledWith(10, 60 * 1000);
    expect(mockUpdateOrganizationMembership).toHaveBeenCalledWith({
      organizationId: "org_123",
      userId: "user_target",
      role: "org:member",
    });
  });
});
