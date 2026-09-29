import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSafeRedirectUrl,
  isValidRedirectUrl,
  isAllowedRedirectHost,
} from "@/shared/security/redirect";

describe("shared/security/redirect", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getSafeRedirectUrl", () => {
    describe("safe relative URLs", () => {
      it("allows standard relative paths", () => {
        expect(getSafeRedirectUrl("/customer")).toBe("/customer");
        expect(getSafeRedirectUrl("/admin")).toBe("/admin");
        expect(getSafeRedirectUrl("/cart")).toBe("/cart");
        expect(getSafeRedirectUrl("/")).toBe("/");
      });

      it("allows relative paths with query parameters and hashes", () => {
        expect(getSafeRedirectUrl("/admin?tab=settings&filter=active#section-1")).toBe(
          "/admin?tab=settings&filter=active#section-1",
        );
        expect(getSafeRedirectUrl("/products/123?sort=desc")).toBe("/products/123?sort=desc");
        expect(getSafeRedirectUrl("/?ref=marketing")).toBe("/?ref=marketing");
      });

      it("trims leading and trailing whitespace from valid relative paths", () => {
        expect(getSafeRedirectUrl("  /customer  ")).toBe("/customer");
        expect(getSafeRedirectUrl("\t/admin\n")).toBe("/admin");
      });
    });

    describe("safe absolute same-origin URLs", () => {
      it("normalizes approved absolute URLs to safe relative paths", () => {
        expect(getSafeRedirectUrl("https://www.dilnova.pp.ua/customer")).toBe("/customer");
        expect(getSafeRedirectUrl("https://dilnova.pp.ua/admin?foo=bar")).toBe("/admin?foo=bar");
        expect(getSafeRedirectUrl("https://www.dilstar.pp.ua/vendors/hardware")).toBe(
          "/vendors/hardware",
        );
        expect(getSafeRedirectUrl("https://dilstar.pp.ua/")).toBe("/");
      });

      it("allows localhost and 127.0.0.1 in non-production environments", () => {
        expect(getSafeRedirectUrl("http://localhost:3000/customer")).toBe("/customer");
        expect(getSafeRedirectUrl("http://127.0.0.1:3000/cart")).toBe("/cart");
      });

      it("allows subdomains of official production domains", () => {
        expect(getSafeRedirectUrl("https://store.dilnova.pp.ua/products")).toBe("/products");
        expect(getSafeRedirectUrl("https://preview.dilstar.pp.ua/services")).toBe("/services");
      });

      it("normalizes VERCEL_URL if configured", () => {
        process.env.VERCEL_URL = "dilnova-preview-abc123.vercel.app";
        expect(
          getSafeRedirectUrl("https://dilnova-preview-abc123.vercel.app/customer?tab=profile"),
        ).toBe("/customer?tab=profile");
      });
    });

    describe("open redirect attack vectors (rejected to fallback)", () => {
      it("rejects external domains", () => {
        expect(getSafeRedirectUrl("https://evil.com")).toBe("/");
        expect(getSafeRedirectUrl("http://evil.com/phishing")).toBe("/");
        expect(getSafeRedirectUrl("https://evil.com/customer")).toBe("/");
        expect(getSafeRedirectUrl("https://attacker.org?redirect=https://dilnova.pp.ua")).toBe("/");
      });

      it("rejects subdomain-lookalike attacker domains", () => {
        expect(getSafeRedirectUrl("https://dilnova.pp.ua.evil.com")).toBe("/");
        expect(getSafeRedirectUrl("https://dilstar.pp.ua.attacker.io")).toBe("/");
        expect(getSafeRedirectUrl("https://evil-dilnova.pp.ua")).toBe("/");
      });

      it("rejects protocol-relative URLs", () => {
        expect(getSafeRedirectUrl("//evil.com")).toBe("/");
        expect(getSafeRedirectUrl("//evil.com/path")).toBe("/");
        expect(getSafeRedirectUrl("///evil.com")).toBe("/");
        expect(getSafeRedirectUrl("////evil.com/test")).toBe("/");
      });

      it("rejects backslash and mixed slash evasion tricks", () => {
        expect(getSafeRedirectUrl("/\\evil.com")).toBe("/");
        expect(getSafeRedirectUrl("\\/evil.com")).toBe("/");
        expect(getSafeRedirectUrl("\\\\evil.com")).toBe("/");
        expect(getSafeRedirectUrl("/\\/evil.com")).toBe("/");
        expect(getSafeRedirectUrl("\\evil.com")).toBe("/");
      });

      it("rejects encoded slash and backslash tricks", () => {
        expect(getSafeRedirectUrl("/%2f/evil.com")).toBe("/");
        expect(getSafeRedirectUrl("/%2fevil.com")).toBe("/");
        expect(getSafeRedirectUrl("/%5cevil.com")).toBe("/");
        expect(getSafeRedirectUrl("/%252f%252fevil.com")).toBe("/");
      });

      it("rejects dangerous pseudo-protocols", () => {
        expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/");
        expect(getSafeRedirectUrl("javascript://evil.com/%0Aalert(1)")).toBe("/");
        expect(getSafeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe("/");
        expect(getSafeRedirectUrl("vbscript:msgbox(1)")).toBe("/");
        expect(getSafeRedirectUrl("file:///etc/passwd")).toBe("/");
        expect(getSafeRedirectUrl("about:blank")).toBe("/");
      });

      it("rejects whitespace and control character tricks", () => {
        expect(getSafeRedirectUrl("/   /evil.com")).toBe("/");
        expect(getSafeRedirectUrl("/\t/evil.com")).toBe("/");
        expect(getSafeRedirectUrl("/\n/evil.com")).toBe("/");
        expect(getSafeRedirectUrl("/\x00/evil.com")).toBe("/");
        expect(getSafeRedirectUrl("/evil\x1F.com")).toBe("/");
      });

      it("rejects non-slash relative strings (domain names without scheme)", () => {
        expect(getSafeRedirectUrl("evil.com")).toBe("/");
        expect(getSafeRedirectUrl("www.evil.com/login")).toBe("/");
      });
    });

    describe("fallback customization", () => {
      it("returns custom fallback when validation fails", () => {
        expect(getSafeRedirectUrl("https://evil.com", "/cart")).toBe("/cart");
        expect(getSafeRedirectUrl("//evil.com", "/dashboard")).toBe("/dashboard");
        expect(getSafeRedirectUrl(null, "/sign-in")).toBe("/sign-in");
        expect(getSafeRedirectUrl(undefined, "/vendor")).toBe("/vendor");
        expect(getSafeRedirectUrl("", "/home")).toBe("/home");
      });
    });

    describe("invalid inputs", () => {
      it("handles null, undefined, empty, and non-string inputs safely", () => {
        expect(getSafeRedirectUrl(null)).toBe("/");
        expect(getSafeRedirectUrl(undefined)).toBe("/");
        expect(getSafeRedirectUrl("")).toBe("/");
        expect(getSafeRedirectUrl("   ")).toBe("/");
        expect(getSafeRedirectUrl(123 as unknown as string)).toBe("/");
        expect(getSafeRedirectUrl({} as unknown as string)).toBe("/");
      });
    });
  });

  describe("isValidRedirectUrl", () => {
    it("returns true for safe redirect paths", () => {
      expect(isValidRedirectUrl("/customer")).toBe(true);
      expect(isValidRedirectUrl("/admin?view=analytics")).toBe(true);
      expect(isValidRedirectUrl("https://www.dilnova.pp.ua/cart")).toBe(true);
    });

    it("returns false for unsafe or malformed URLs", () => {
      expect(isValidRedirectUrl("https://evil.com")).toBe(false);
      expect(isValidRedirectUrl("//evil.com")).toBe(false);
      expect(isValidRedirectUrl("javascript:alert(1)")).toBe(false);
      expect(isValidRedirectUrl("")).toBe(false);
      expect(isValidRedirectUrl(null)).toBe(false);
      expect(isValidRedirectUrl(undefined)).toBe(false);
    });
  });

  describe("isAllowedRedirectHost", () => {
    it("recognizes official brand hostnames", () => {
      expect(isAllowedRedirectHost("dilnova.pp.ua")).toBe(true);
      expect(isAllowedRedirectHost("www.dilnova.pp.ua")).toBe(true);
      expect(isAllowedRedirectHost("dilstar.pp.ua")).toBe(true);
      expect(isAllowedRedirectHost("www.dilstar.pp.ua")).toBe(true);
    });

    it("recognizes subdomains of primary domains", () => {
      expect(isAllowedRedirectHost("clerk.dilnova.pp.ua")).toBe(true);
      expect(isAllowedRedirectHost("api.dilstar.pp.ua")).toBe(true);
    });

    it("recognizes localhost and 127.0.0.1", () => {
      expect(isAllowedRedirectHost("localhost")).toBe(true);
      expect(isAllowedRedirectHost("127.0.0.1")).toBe(true);
    });

    it("rejects unknown external domains", () => {
      expect(isAllowedRedirectHost("evil.com")).toBe(false);
      expect(isAllowedRedirectHost("phishing.dilnova.com")).toBe(false);
      expect(isAllowedRedirectHost("notdilnova.pp.ua")).toBe(false);
    });
  });
});
