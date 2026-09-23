import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildCsp,
  buildReportOnlyCsp,
  shouldExcludeEval,
  isStrictCspRequested,
  extractClerkDomain,
  getClerkCspDomains,
  getSupabaseHostCsp,
  getSentryCspReportUri,
} from "@/shared/security/csp";

describe("shared/security/csp", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("extractClerkDomain", () => {
    it("extracts custom domain from valid Clerk publishable key", () => {
      // payload base64 encoded "clerk.custom.domain$suffix"
      const payload = Buffer.from("clerk.custom.domain$test").toString("base64");
      const key = `pk_test_${payload}`;
      expect(extractClerkDomain(key)).toBe("clerk.custom.domain");
    });

    it("returns null when key is missing or invalid", () => {
      expect(extractClerkDomain("")).toBeNull();
      expect(extractClerkDomain("invalid-key")).toBeNull();
    });
  });

  describe("getClerkCspDomains", () => {
    it("includes default clerk domains", () => {
      const domains = getClerkCspDomains();
      expect(domains).toContain("https://img.clerk.com");
      expect(domains).toContain("https://*.clerk.com");
      expect(domains).toContain("https://*.clerk.accounts.dev");
      expect(domains).toContain("https://clerk.dilstar.pp.ua");
      expect(domains).toContain("https://clerk.dilnova.pp.ua");
    });

    it("appends custom clerk domain if provided", () => {
      const domains = getClerkCspDomains("custom.clerk.domain.com");
      expect(domains).toContain("https://custom.clerk.domain.com");
    });
  });

  describe("getSupabaseHostCsp", () => {
    it("extracts hostname with leading space for CSP injection", () => {
      expect(getSupabaseHostCsp("https://xyz.supabase.co")).toBe(" https://xyz.supabase.co");
    });

    it("returns empty string when url is empty or invalid", () => {
      expect(getSupabaseHostCsp(null)).toBe("");
      expect(getSupabaseHostCsp("not-a-url")).toBe("");
    });
  });

  describe("getSentryCspReportUri", () => {
    it("parses Sentry DSN into CSP report-uri", () => {
      const dsn = "https://public_key@sentry.io/12345";
      expect(getSentryCspReportUri(dsn)).toBe(
        "https://sentry.io/api/12345/security/?sentry_key=public_key",
      );
    });

    it("returns null when DSN is missing or invalid", () => {
      expect(getSentryCspReportUri(null)).toBeNull();
      expect(getSentryCspReportUri("invalid")).toBeNull();
    });
  });

  describe("isStrictCspRequested", () => {
    it("returns true when STRICT_CSP=true", () => {
      process.env.STRICT_CSP = "true";
      expect(isStrictCspRequested()).toBe(true);
    });

    it("returns true when CSP_STRICT=true", () => {
      delete process.env.STRICT_CSP;
      process.env.CSP_STRICT = "true";
      expect(isStrictCspRequested()).toBe(true);
    });

    it("returns false when unset or false", () => {
      delete process.env.STRICT_CSP;
      delete process.env.CSP_STRICT;
      expect(isStrictCspRequested()).toBe(false);

      process.env.STRICT_CSP = "false";
      expect(isStrictCspRequested()).toBe(false);
    });
  });

  describe("shouldExcludeEval", () => {
    it("returns true in production", () => {
      expect(shouldExcludeEval({ isProd: true })).toBe(true);
    });

    it("returns true when isStrict is set", () => {
      expect(shouldExcludeEval({ isProd: false, isStrict: true })).toBe(true);
    });

    it("returns true when VERCEL_ENV is production or preview", () => {
      process.env.NODE_ENV = "development";
      process.env.VERCEL_ENV = "preview";
      expect(shouldExcludeEval()).toBe(true);

      process.env.VERCEL_ENV = "production";
      expect(shouldExcludeEval()).toBe(true);
    });

    it("returns false in normal development", () => {
      process.env.NODE_ENV = "development";
      delete process.env.VERCEL_ENV;
      delete process.env.STRICT_CSP;
      delete process.env.CSP_STRICT;
      expect(shouldExcludeEval({ isProd: false, isStrict: false })).toBe(false);
    });
  });

  describe("buildCsp", () => {
    it("includes 'unsafe-eval' when excludeEval is false", () => {
      const csp = buildCsp({
        isProd: false,
        excludeEval: false,
        nonce: "test-nonce",
      });

      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("nonce-test-nonce");
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).not.toContain("upgrade-insecure-requests;");
    });

    it("strictly excludes 'unsafe-eval' when excludeEval is true", () => {
      const csp = buildCsp({
        isProd: false,
        excludeEval: true,
        nonce: "test-nonce",
      });

      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).toContain("nonce-test-nonce");
      expect(csp).toContain("'strict-dynamic'");
    });

    it("includes upgrade-insecure-requests in production", () => {
      const csp = buildCsp({
        isProd: true,
        excludeEval: true,
        nonce: "test-nonce",
      });

      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).toContain("upgrade-insecure-requests;");
    });

    it("supports static fallback mode (without nonce)", () => {
      const cspDev = buildCsp({
        isProd: false,
        excludeEval: false,
      });

      expect(cspDev).toContain("script-src 'self' 'unsafe-eval' ");
      expect(cspDev).not.toContain("strict-dynamic");

      const cspProd = buildCsp({
        isProd: true,
        excludeEval: true,
      });

      expect(cspProd).toContain("script-src 'self' https://img.clerk.com");
      expect(cspProd).not.toContain("'unsafe-eval'");
    });

    it("injects custom report URI when provided", () => {
      const csp = buildCsp({
        reportUri: "https://example.com/csp-report",
      });

      expect(csp).toContain("report-uri https://example.com/csp-report;");
    });
  });

  describe("buildReportOnlyCsp", () => {
    it("always excludes 'unsafe-eval' and defaults report-uri to /api/csp-report", () => {
      const reportOnly = buildReportOnlyCsp({
        nonce: "nonce-123",
      });

      expect(reportOnly).not.toContain("'unsafe-eval'");
      expect(reportOnly).toContain("nonce-nonce-123");
      expect(reportOnly).toContain("report-uri /api/csp-report;");
      expect(reportOnly).not.toContain("upgrade-insecure-requests;");
    });

    it("preserves custom reportUri if supplied", () => {
      const reportOnly = buildReportOnlyCsp({
        reportUri: "https://custom.sentry.io/csp",
      });

      expect(reportOnly).not.toContain("'unsafe-eval'");
      expect(reportOnly).toContain("report-uri https://custom.sentry.io/csp;");
    });
  });
});
