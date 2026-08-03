import { describe, it, expect } from "vitest";
import { computeOnboardingStatusFromData } from "@/features/organization/onboarding";

describe("computeOnboardingStatusFromData", () => {
  it("returns low completion when publicMetadata is empty", () => {
    const status = computeOnboardingStatusFromData("org_123", {}, "LKR", false);

    expect(status.orgId).toBe("org_123");
    expect(status.completionPercent).toBe(0); // 0 out of 6
    expect(status.isCompleted).toBe(false);
    expect(status.missingFieldKeys).toContain("description");
    expect(status.missingFieldKeys).toContain("address");
    expect(status.missingFieldKeys).toContain("phone");
    expect(status.missingFieldKeys).toContain("bannerUrl");
    expect(status.missingFieldKeys).toContain("baseCurrency");
    expect(status.missingFieldKeys).toContain("checkoutOptions");
  });

  it("returns 100% completion when all mandatory fields are provided", () => {
    const metadata = {
      description: "Premier electronics store in Colombo.",
      address: "123 Main Street, Colombo 03",
      phone: "+94 11 234 5678",
      bannerUrl: "https://res.cloudinary.com/demo/image/upload/banner.png",
      checkout_options: {
        standard_delivery: true,
        cash_on_delivery: true,
      },
    };

    const status = computeOnboardingStatusFromData("org_456", metadata, "USD", true);

    expect(status.completionPercent).toBe(100);
    expect(status.isCompleted).toBe(true);
    expect(status.missingFieldKeys).toHaveLength(0);
    expect(status.initialValues.baseCurrency).toBe("USD");
  });

  it("correctly identifies missing checkoutOptions and address", () => {
    const metadata = {
      description: "Only description provided",
    };

    const status = computeOnboardingStatusFromData("org_789", metadata, "EUR", true);

    expect(status.completionPercent).toBe(33); // description + baseCurrency = 2 out of 6 (33%)
    expect(status.isCompleted).toBe(false);
    expect(status.missingFieldKeys).toContain("address");
    expect(status.missingFieldKeys).toContain("phone");
    expect(status.missingFieldKeys).toContain("bannerUrl");
    expect(status.missingFieldKeys).toContain("checkoutOptions");
  });
});
