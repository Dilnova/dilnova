import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCachedUserRole, getCachedIsSuperAdmin } from "@/shared/auth/clerk-cache";
import { getCurrentSuperAdminUser } from "@/shared/auth/superadmin-guard";
import AdminLayout from "@/app/(admin)/layout";
import CustomerLayout from "@/app/(customer)/layout";
import VendorLayout from "@/app/(vendor)/layout";
import SuperAdminLayout from "@/app/(superadmin)/layout";
import React from "react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/auth/clerk-cache", () => ({
  getCachedUserRole: vi.fn(),
  getCachedIsSuperAdmin: vi.fn(),
}));

vi.mock("@/shared/auth/superadmin-guard", () => ({
  getCurrentSuperAdminUser: vi.fn(),
}));

vi.mock("@/shared/ui/notifications/GlobalNotificationListener", () => ({
  GlobalNotificationListener: () => null,
}));

describe("Route Layout RBAC Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminLayout (/admin)", () => {
    it("redirects unauthenticated users to /sign-in", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null, orgRole: null } as never);

      await AdminLayout({ children: React.createElement("div", null, "content") });
      expect(redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("redirects users without org:admin role to /unauthorized", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_member",
        orgId: "org_123",
        orgRole: "org:member",
      } as never);

      await AdminLayout({ children: React.createElement("div", null, "content") });
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });

    it("redirects users with no org context to /unauthorized", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_no_org",
        orgId: null,
        orgRole: null,
      } as never);

      await AdminLayout({ children: React.createElement("div", null, "content") });
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });

    it("renders children when user has org:admin role", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_admin",
        orgId: "org_123",
        orgRole: "org:admin",
      } as never);

      const result = await AdminLayout({
        children: React.createElement("div", null, "admin content"),
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("CustomerLayout (/customer)", () => {
    it("redirects unauthenticated users to /sign-in?redirect_url=/customer", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never);

      await CustomerLayout({ children: React.createElement("div", null, "content") });
      expect(redirect).toHaveBeenCalledWith("/sign-in?redirect_url=/customer");
    });

    it("renders children when user is authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user_cust" } as never);

      const result = await CustomerLayout({
        children: React.createElement("div", null, "customer content"),
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("VendorLayout (/vendor)", () => {
    it("redirects unauthenticated users to /sign-in", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never);

      await VendorLayout({ children: React.createElement("div", null, "content") });
      expect(redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("allows org:member to access vendor layout", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_member",
        orgId: "org_123",
        orgRole: "org:member",
      } as never);

      const result = await VendorLayout({
        children: React.createElement("div", null, "vendor content"),
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("allows org:admin to access vendor layout", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_admin",
        orgId: "org_123",
        orgRole: "org:admin",
      } as never);

      const result = await VendorLayout({
        children: React.createElement("div", null, "vendor content"),
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("redirects users without org and without global vendor/superadmin role to /unauthorized", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_regular",
        orgId: null,
        orgRole: null,
      } as never);
      vi.mocked(getCachedUserRole).mockResolvedValue("customer");
      vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

      await VendorLayout({ children: React.createElement("div", null, "content") });
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });

    it("allows global vendor without org to access vendor layout (e.g. to create an org)", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_global_vendor",
        orgId: null,
        orgRole: null,
      } as never);
      vi.mocked(getCachedUserRole).mockResolvedValue("vendor");
      vi.mocked(getCachedIsSuperAdmin).mockResolvedValue(false);

      const result = await VendorLayout({
        children: React.createElement("div", null, "vendor content"),
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("SuperAdminLayout (/superadmin)", () => {
    it("redirects when getCurrentSuperAdminUser returns null", async () => {
      vi.mocked(getCurrentSuperAdminUser).mockResolvedValue(null);

      await SuperAdminLayout({ children: React.createElement("div", null, "content") });
      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });

    it("renders children when getCurrentSuperAdminUser returns a valid superadmin user", async () => {
      vi.mocked(getCurrentSuperAdminUser).mockResolvedValue({
        id: "user_superadmin",
        privateMetadata: { platformRole: "superadmin" },
      } as never);

      const result = await SuperAdminLayout({
        children: React.createElement("div", null, "superadmin content"),
      });
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
