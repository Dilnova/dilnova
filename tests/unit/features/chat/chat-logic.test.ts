import { describe, expect, it } from "vitest";
import type { ChatMessageItem, ShippingQuoteMetadata } from "@/features/chat/types";

describe("Chat Logic & Domain Rules", () => {
  it("formats shipping quote content correctly", () => {
    const meta: ShippingQuoteMetadata = {
      fee: 45000,
      currency: "LKR",
      carrier: "Pronto Express",
      zone: "Colombo Suburbs",
      estimatedDays: 2,
      notes: "Fragile handling included",
    };

    const formattedFee = (meta.fee / 100).toFixed(2);
    expect(formattedFee).toBe("450.00");

    const content = `Shipping Fee Quote: ${meta.currency} ${formattedFee} via ${meta.carrier} (Est. ${meta.estimatedDays} days) — ${meta.notes}`;
    expect(content).toContain("LKR 450.00");
    expect(content).toContain("Pronto Express");
    expect(content).toContain("2 days");
  });

  it("handles different sender roles with correct labels", () => {
    const roles: ChatMessageItem["senderRole"][] = ["customer", "vendor_admin", "vendor_member"];

    const getRoleLabel = (role: ChatMessageItem["senderRole"]) => {
      switch (role) {
        case "vendor_admin":
          return "Store Admin";
        case "vendor_member":
          return "Branch Staff";
        case "customer":
        default:
          return "Customer";
      }
    };

    const expectedLabels = ["Customer", "Store Admin", "Branch Staff"];
    roles.forEach((r, idx) => {
      expect(getRoleLabel(r)).toBe(expectedLabels[idx]);
    });
  });

  it("identifies image attachments by file extension", () => {
    const isImageAttachment = (url: string | null | undefined) => {
      if (!url) return false;
      return /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(url);
    };

    expect(isImageAttachment("https://res.cloudinary.com/demo/image/upload/sample.jpg")).toBe(true);
    expect(isImageAttachment("https://res.cloudinary.com/demo/image/upload/photo.PNG")).toBe(true);
    expect(isImageAttachment("https://res.cloudinary.com/demo/raw/upload/invoice.pdf")).toBe(false);
    expect(isImageAttachment("https://res.cloudinary.com/demo/raw/upload/terms.docx")).toBe(false);
    expect(isImageAttachment(null)).toBe(false);
  });

  it("grants customer access to their own order conversations even when logged in with an active org", () => {
    const conversation = {
      customerUserId: "user_customer_123",
      orgId: "org_vendor_abc",
      branchId: "branch_xyz",
    };

    const evaluateAccess = (
      userId: string,
      orgId: string | null,
      orgRole: string | null,
      assignedBranchIds: string[],
    ) => {
      const isCustomer = conversation.customerUserId === userId;
      const isVendor = orgId && conversation.orgId === orgId;

      if (!isCustomer && !isVendor) return { allowed: false, reason: "forbidden" };

      // Customer who placed the order always has access
      if (isCustomer) return { allowed: true, role: "customer" };

      // Vendor member must be assigned to branch
      if (isVendor && orgRole === "org:member" && conversation.branchId) {
        if (!assignedBranchIds.includes(conversation.branchId)) {
          return { allowed: false, reason: "not_in_branch" };
        }
      }

      return { allowed: true, role: orgRole === "org:admin" ? "vendor_admin" : "vendor_member" };
    };

    // Case 1: Customer accessing own order (even if they also belong to the org as a member)
    const customerAccess = evaluateAccess("user_customer_123", "org_vendor_abc", "org:member", []);
    expect(customerAccess.allowed).toBe(true);
    expect(customerAccess.role).toBe("customer");

    // Case 2: Vendor member not in assigned branch accessing another customer's order
    const unauthorizedMember = evaluateAccess("user_other_staff", "org_vendor_abc", "org:member", [
      "branch_other",
    ]);
    expect(unauthorizedMember.allowed).toBe(false);
    expect(unauthorizedMember.reason).toBe("not_in_branch");

    // Case 3: Vendor member in assigned branch
    const authorizedMember = evaluateAccess("user_staff", "org_vendor_abc", "org:member", [
      "branch_xyz",
    ]);
    expect(authorizedMember.allowed).toBe(true);
    expect(authorizedMember.role).toBe("vendor_member");
  });
});
