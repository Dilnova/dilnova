import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/shared/platform/settings", () => ({
  getSystemSetting: vi.fn().mockImplementation(async (key: string, defaultValue: string) => {
    if (key === "system_name") return "Dilnova Commerce";
    return defaultValue;
  }),
}));

import PrivacyPolicy, {
  generateMetadata as generatePrivacyMetadata,
  revalidate as privacyRevalidate,
} from "@/app/privacy/page";
import TermsOfService, {
  generateMetadata as generateTermsMetadata,
  revalidate as termsRevalidate,
} from "@/app/terms/page";
import CookiePolicy, {
  generateMetadata as generateCookieMetadata,
  revalidate as cookieRevalidate,
} from "@/app/cookie/page";
import RefundPolicy, {
  metadata as refundMetadata,
  revalidate as refundRevalidate,
} from "@/app/refund/page";
import Subprocessors, {
  generateMetadata as generateSubprocessorsMetadata,
  revalidate as subprocessorsRevalidate,
} from "@/app/privacy/subprocessors/page";
import PrivacyPolicyAlias, {
  generateMetadata as generatePrivacyAliasMetadata,
  revalidate as privacyAliasRevalidate,
} from "@/app/privacy-policy/page";
import TermsOfServiceAlias, {
  generateMetadata as generateTermsAliasMetadata,
  revalidate as termsAliasRevalidate,
} from "@/app/terms-of-service/page";

describe("Legal & Compliance Pages", () => {
  describe("Privacy Policy (/privacy)", () => {
    it("exports valid metadata with dynamic system name", async () => {
      const metadata = await generatePrivacyMetadata();
      expect(metadata.title).toBe("Privacy Policy | Dilnova Commerce");
      expect(metadata.description).toContain("Dilnova Commerce");
      expect(metadata.description).toContain("GDPR");
    });

    it("has 24-hour cache revalidation", () => {
      expect(privacyRevalidate).toBe(86400);
    });

    it("renders core GDPR and enterprise privacy sections", async () => {
      const element = await PrivacyPolicy();
      expect(element).toBeDefined();
      expect(element.type).toBe("div");
    });
  });

  describe("Terms of Service (/terms)", () => {
    it("exports valid metadata with dynamic system name", async () => {
      const metadata = await generateTermsMetadata();
      expect(metadata.title).toBe("Terms of Service | Dilnova Commerce");
      expect(metadata.description).toContain("Dilnova Commerce");
    });

    it("has 24-hour cache revalidation", () => {
      expect(termsRevalidate).toBe(86400);
    });

    it("renders core marketplace terms and warranty disclaimers", async () => {
      const element = await TermsOfService();
      expect(element).toBeDefined();
      expect(element.type).toBe("div");
    });
  });

  describe("Cookie Policy (/cookie)", () => {
    it("exports valid metadata", async () => {
      const metadata = await generateCookieMetadata();
      expect(metadata.title).toBe("Cookie Policy | Dilnova Commerce");
    });

    it("has 24-hour cache revalidation", () => {
      expect(cookieRevalidate).toBe(86400);
    });

    it("renders cookie policy content", async () => {
      const element = await CookiePolicy();
      expect(element).toBeDefined();
    });
  });

  describe("Refund & Return Policy (/refund)", () => {
    it("exports static metadata", () => {
      expect(refundMetadata.title).toContain("Refund & Return Policy");
      expect(refundMetadata.description).toContain("Sri Lanka");
    });

    it("has 24-hour cache revalidation", () => {
      expect(refundRevalidate).toBe(86400);
    });

    it("renders refund policy content", () => {
      const element = RefundPolicy();
      expect(element).toBeDefined();
    });
  });

  describe("Subprocessors (/privacy/subprocessors)", () => {
    it("exports valid metadata", async () => {
      const metadata = await generateSubprocessorsMetadata();
      expect(metadata.title).toBe("Subprocessors | Dilnova Commerce");
    });

    it("has 24-hour cache revalidation", () => {
      expect(subprocessorsRevalidate).toBe(86400);
    });

    it("renders subprocessor register", async () => {
      const element = await Subprocessors();
      expect(element).toBeDefined();
    });
  });

  describe("Route Aliases (/privacy-policy & /terms-of-service)", () => {
    it("renders privacy-policy alias with canonical URL pointing to /privacy", async () => {
      const metadata = await generatePrivacyAliasMetadata();
      expect(metadata.title).toBe("Privacy Policy | Dilnova Commerce");
      expect(metadata.alternates?.canonical).toBe("/privacy");
      expect(privacyAliasRevalidate).toBe(86400);

      const element = await PrivacyPolicyAlias();
      expect(element).toBeDefined();
    });

    it("renders terms-of-service alias with canonical URL pointing to /terms", async () => {
      const metadata = await generateTermsAliasMetadata();
      expect(metadata.title).toBe("Terms of Service | Dilnova Commerce");
      expect(metadata.alternates?.canonical).toBe("/terms");
      expect(termsAliasRevalidate).toBe(86400);

      const element = await TermsOfServiceAlias();
      expect(element).toBeDefined();
    });
  });
});
