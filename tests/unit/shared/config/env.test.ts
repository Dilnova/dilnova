import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerConfig, env, validateServerEnv } from "@/shared/config/env";
import { logger } from "@/shared/logging/logger";

describe("shared/config/env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getServerConfig()", () => {
    it("returns formatted ServerConfig object with parsed fields", () => {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_APP_URL = "https://app.dilnova.com";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
      process.env.DATABASE_POOL_SIZE = "15";
      process.env.SMTP_PORT = "2525";
      process.env.SUPERADMIN_USER_IDS = "user_1, user_2 ,user_3";
      process.env.SENTRY_TRACES_SAMPLE_RATE = "0.25";
      process.env.SHIPPING_DEFAULT_CARRIER = "easypost";
      process.env.SHIPPING_ORIGIN_COUNTRY = "US";
      process.env.SHIPPO_API_KEY = "shippo_test_123";
      process.env.EASYPOST_API_KEY = "EZTK_123";
      process.env.USD_TO_LKR_RATE = "320.5";
      process.env.PII_ENCRYPTION_KEY_V1 = "old_encryption_key";
      process.env.STRICT_CSP = "true";
      process.env.DATABASE_SSL = "false";
      process.env.VERCEL = "1";
      process.env.NEXT_PUBLIC_APP_NAME = "Custom Hub";

      const config = getServerConfig();

      expect(config.app.url).toBe("https://app.dilnova.com");
      expect(config.app.name).toBe("Custom Hub");
      expect(config.app.isProduction).toBe(true);
      expect(config.app.isDevelopment).toBe(false);
      expect(config.app.isTest).toBe(false);
      expect(config.app.isVercel).toBe(true);

      expect(config.database.url).toBe("postgresql://user:pass@localhost:5432/db");
      expect(config.database.poolSize).toBe(15);
      expect(config.database.ssl).toBe(false);
      expect(config.database.isServerless).toBe(true);

      expect(config.email.smtpPort).toBe(2525);
      expect(config.auth.superadminUserIds).toEqual(["user_1", "user_2", "user_3"]);
      expect(config.sentry.tracesSampleRate).toBe(0.25);

      expect(config.shipping.defaultCarrier).toBe("easypost");
      expect(config.shipping.originCountry).toBe("US");
      expect(config.shipping.shippoApiKey).toBe("shippo_test_123");
      expect(config.shipping.easypostApiKey).toBe("EZTK_123");
      expect(config.shipping.usdToLkrRate).toBe(320.5);

      expect(config.security.piiEncryptionKeyV1).toBe("old_encryption_key");
      expect(config.security.isStrictCsp).toBe(true);
    });

    it("provides safe defaults in non-production when optional fields are omitted", () => {
      process.env.NODE_ENV = "development";
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.DATABASE_POOL_SIZE;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_HOST;
      delete process.env.SUPERADMIN_USER_IDS;
      delete process.env.SHIPPING_DEFAULT_CARRIER;
      delete process.env.SHIPPING_ORIGIN_COUNTRY;
      delete process.env.SHIPPO_API_KEY;
      delete process.env.EASYPOST_API_KEY;
      delete process.env.USD_TO_LKR_RATE;
      delete process.env.PII_ENCRYPTION_KEY_V1;
      delete process.env.STRICT_CSP;
      delete process.env.DATABASE_SSL;
      delete process.env.VERCEL;

      const config = getServerConfig();

      expect(config.app.url).toBe("http://localhost:3000");
      expect(config.app.name).toBe("Dilnova");
      expect(config.app.isDevelopment).toBe(true);
      expect(config.app.isProduction).toBe(false);
      expect(config.app.isVercel).toBe(false);
      expect(config.database.poolSize).toBeUndefined();
      expect(config.database.ssl).toBe(true);
      expect(config.database.isServerless).toBe(false);
      expect(config.email.smtpPort).toBe(587);
      expect(config.email.smtpHost).toBe("smtp-relay.brevo.com");
      expect(config.auth.superadminUserIds).toEqual([]);
      expect(config.shipping.defaultCarrier).toBe("slpost");
      expect(config.shipping.originCountry).toBe("LK");
      expect(config.shipping.shippoApiKey).toBeUndefined();
      expect(config.shipping.easypostApiKey).toBeUndefined();
      expect(config.shipping.usdToLkrRate).toBe(307.69);
      expect(config.security.piiEncryptionKeyV1).toBeUndefined();
      expect(config.security.isStrictCsp).toBe(false);
    });
  });

  describe("env proxy", () => {
    it("dynamically reflects process.env mutations at runtime", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://initial.example.com";
      expect(env.app.url).toBe("https://initial.example.com");

      process.env.NEXT_PUBLIC_APP_URL = "https://mutated.example.com";
      expect(env.app.url).toBe("https://mutated.example.com");
    });

    it("accurately reports environment flags", () => {
      process.env.NODE_ENV = "production";
      expect(env.app.isProduction).toBe(true);
      expect(env.app.isDevelopment).toBe(false);

      process.env.NODE_ENV = "test";
      expect(env.app.isTest).toBe(true);
      expect(env.app.isProduction).toBe(false);
    });
  });

  describe("validateServerEnv()", () => {
    it("does not throw in development or test environments", () => {
      process.env.NODE_ENV = "development";
      delete process.env.DATABASE_URL;
      expect(() => validateServerEnv()).not.toThrow();

      process.env.NODE_ENV = "test";
      expect(() => validateServerEnv()).not.toThrow();
    });

    it("does not throw during Next.js production build phase", () => {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PHASE = "phase-production-build";
      delete process.env.DATABASE_URL;
      expect(() => validateServerEnv()).not.toThrow();
    });

    it("throws when required production variables are missing", () => {
      process.env.NODE_ENV = "production";
      delete process.env.NEXT_PHASE;
      delete process.env.DATABASE_URL;

      expect(() => validateServerEnv()).toThrow("Server environment validation failed");
    });

    it("throws when QStash signing keys are missing in production", () => {
      process.env.NODE_ENV = "production";
      delete process.env.NEXT_PHASE;
      delete process.env.QSTASH_CURRENT_SIGNING_KEY;

      expect(() => validateServerEnv()).toThrow("Server environment validation failed");
    });

    it("throws when preview deployment attempts to use production database", () => {
      // Start from a completely clean env to prevent Vercel build vars
      // (e.g. DATABASE_POOL_SIZE, SMTP_PORT) from leaking into schema validation.
      process.env = {
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        DATABASE_URL:
          "postgresql://postgres:pass@db.jnsfgoafayvlukjkqzjm.supabase.co:5432/postgres",
        PII_ENCRYPTION_KEY: "test_pii_encryption_key_value_32_chars",
        CLERK_SECRET_KEY: "sk_live_valid_key",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_valid_key",
        NEXT_PUBLIC_APP_URL: "https://preview.dilnova.com",
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "cloud",
        CLOUDINARY_API_KEY: "key",
        CLOUDINARY_API_SECRET: "secret",
        NEXT_PUBLIC_SUPABASE_URL: "https://preview.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_key",
        SUPABASE_SERVICE_ROLE_KEY: "sb_secret",
        UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token",
        QSTASH_TOKEN: "qstash_token",
        QSTASH_CURRENT_SIGNING_KEY: "sig_current",
        QSTASH_NEXT_SIGNING_KEY: "sig_next",
        HEALTH_CHECK_SECRET: "health_secret",
        CRON_SECRET: "cron_secret",
        SUPERADMIN_USER_IDS: "user_1",
        CLERK_WEBHOOK_SECRET: "whsec_key",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile_site",
        TURNSTILE_SECRET_KEY: "turnstile_secret",
        SMTP_USER: "smtp_user",
        SMTP_PASSWORD: "smtp_pass",
        EMAIL_FROM_ADDRESS: "support@dilnova.com",
        EMAIL_FROM_NAME: "Dilnova",
        SENTRY_DSN: "https://public@sentry.example.com/1",
      } as unknown as NodeJS.ProcessEnv;

      expect(() => validateServerEnv()).toThrow(
        "Preview deployments must not use the production DATABASE_URL",
      );
    });

    it("emits a security warning when production validation is bypassed for CI/E2E tests", () => {
      process.env.NODE_ENV = "production";
      process.env.CLERK_SECRET_KEY = "sk_test_ci_dummy";
      delete process.env.VERCEL;
      delete process.env.NEXT_PHASE;
      delete process.env.DATABASE_URL; // Intentionally missing

      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

      expect(() => validateServerEnv()).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      const firstCallMsg = warnSpy.mock.calls[0]?.[0];
      expect(firstCallMsg).toContain("[SECURITY WARNING]");
      expect(firstCallMsg).toContain("Production environment validation was BYPASSED");

      warnSpy.mockRestore();
    });

    it("does NOT bypass validation if running on Vercel even with CI dummy key", () => {
      process.env.NODE_ENV = "production";
      process.env.CLERK_SECRET_KEY = "sk_test_ci_dummy";
      process.env.VERCEL = "1";
      delete process.env.NEXT_PHASE;
      delete process.env.DATABASE_URL;

      expect(() => validateServerEnv()).toThrow("Server environment validation failed");
    });
  });
});
