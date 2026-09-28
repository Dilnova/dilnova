import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireVendorRole } from "@/shared/auth/vendor-guard";
import { auth } from "@clerk/nextjs/server";
import { getCachedUserRole, getCachedIsSuperAdmin } from "@/shared/auth/clerk-cache";
import { ActionError } from "@/shared/errors/action-error";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/auth/clerk-cache", () => ({
  getCachedUserRole: vi.fn(),
  getCachedIsSuperAdmin: vi.fn(),
}));

describe("requireVendorRole guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ActionError when user is unauthenticated (no userId)", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null, orgRole: null } as never);

    await expect(requireVendorRole()).rejects.toThrow(ActionError);
    await expect(requireVendorRole()).rejects.toThrow("Not authorized: You must be signed in.");
  });

  it("throws ActionError when user has global 'customer' role", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_cust_123",
      orgId: "org_123",
      orgRole: "org:member",
    } as never);
    vi.mocked(getCachedUserRole).mockResolvedValue("customer");
    vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

    await expect(requireVendorRole()).rejects.toThrow(ActionError);
    await expect(requireVendorRole()).rejects.toThrow(
      "Not authorized: Customers cannot perform vendor actions.",
    );
  });

  it("allows user with global 'vendor' role even without org membership", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_vendor_123",
      orgId: null,
      orgRole: null,
    } as never);
    vi.mocked(getCachedUserRole).mockResolvedValue("vendor");
    vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

    await expect(requireVendorRole()).resolves.toBeUndefined();
  });

  it("allows user who is a superadmin even without org membership", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_admin_123",
      orgId: null,
      orgRole: null,
    } as never);
    vi.mocked(getCachedUserRole).mockResolvedValue(null);
    vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(true);

    await expect(requireVendorRole()).resolves.toBeUndefined();
  });

  it("allows user with org:admin role in an active organization", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_org_admin_123",
      orgId: "org_vendor_abc",
      orgRole: "org:admin",
    } as never);
    vi.mocked(getCachedUserRole).mockResolvedValue(null);
    vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

    await expect(requireVendorRole()).resolves.toBeUndefined();
  });

  it("allows user with org:member role in an active organization", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_org_member_123",
      orgId: "org_vendor_abc",
      orgRole: "org:member",
    } as never);
    vi.mocked(getCachedUserRole).mockResolvedValue(null);
    vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

    await expect(requireVendorRole()).resolves.toBeUndefined();
  });

  it("throws ActionError when user is signed in but has no vendor role and no org membership", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_regular_123",
      orgId: null,
      orgRole: null,
    } as never);
    vi.mocked(getCachedUserRole).mockResolvedValue(null);
    vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

    await expect(requireVendorRole()).rejects.toThrow(ActionError);
    await expect(requireVendorRole()).rejects.toThrow(
      "Not authorized: You do not have vendor permissions.",
    );
  });

  it("accepts an explicit userId parameter override", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "different_id",
      orgId: null,
      orgRole: null,
    } as never);
    vi.mocked(getCachedUserRole).mockResolvedValue("vendor");
    vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

    await expect(requireVendorRole("explicit_uid")).resolves.toBeUndefined();
    expect(getCachedUserRole).toHaveBeenCalledWith("explicit_uid");
  });
});
