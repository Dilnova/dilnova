import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getServerConfig, env, validateServerEnv } from "@/shared/config/env";

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

      const config = getServerConfig();

      expect(config.app.url).toBe("https://app.dilnova.com");
      expect(config.app.isProduction).toBe(true);
      expect(config.app.isDevelopment).toBe(false);
      expect(config.app.isTest).toBe(false);

      expect(config.database.url).toBe("postgresql://user:pass@localhost:5432/db");
      expect(config.database.poolSize).toBe(15);

      expect(config.email.smtpPort).toBe(2525);
      expect(config.auth.superadminUserIds).toEqual(["user_1", "user_2", "user_3"]);
      expect(config.sentry.tracesSampleRate).toBe(0.25);
    });

    it("provides safe defaults in non-production when optional fields are omitted", () => {
      process.env.NODE_ENV = "development";
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.DATABASE_POOL_SIZE;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_HOST;
      delete process.env.SUPERADMIN_USER_IDS;

      const config = getServerConfig();

      expect(config.app.url).toBe("http://localhost:3000");
      expect(config.app.isDevelopment).toBe(true);
      expect(config.app.isProduction).toBe(false);
      expect(config.database.poolSize).toBeUndefined();
      expect(config.email.smtpPort).toBe(587);
      expect(config.email.smtpHost).toBe("smtp-relay.brevo.com");
      expect(config.auth.superadminUserIds).toEqual([]);
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
      process.env.NODE_ENV = "production";
      process.env.VERCEL_ENV = "preview";
      delete process.env.NEXT_PHASE;

      // Fully populated valid base env
      process.env.DATABASE_URL =
        "postgresql://postgres:pass@db.jnsfgoafayvlukjkqzjm.supabase.co:5432/postgres";
      process.env.PII_ENCRYPTION_KEY = "test_pii_encryption_key_value_32_chars";
      process.env.CLERK_SECRET_KEY = "sk_live_valid_key";
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_valid_key";
      process.env.NEXT_PUBLIC_APP_URL = "https://preview.dilnova.com";
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "cloud";
      process.env.CLOUDINARY_API_KEY = "key";
      process.env.CLOUDINARY_API_SECRET = "secret";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://preview.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret";
      process.env.UPSTASH_REDIS_REST_URL = "https://redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token";
      process.env.QSTASH_TOKEN = "qstash_token";
      process.env.QSTASH_CURRENT_SIGNING_KEY = "sig_current";
      process.env.QSTASH_NEXT_SIGNING_KEY = "sig_next";
      process.env.HEALTH_CHECK_SECRET = "health_secret";
      process.env.CRON_SECRET = "cron_secret";
      process.env.SUPERADMIN_USER_IDS = "user_1";
      process.env.CLERK_WEBHOOK_SECRET = "whsec_key";
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "turnstile_site";
      process.env.TURNSTILE_SECRET_KEY = "turnstile_secret";
      process.env.SMTP_USER = "smtp_user";
      process.env.SMTP_PASSWORD = "smtp_pass";
      process.env.EMAIL_FROM_ADDRESS = "support@dilnova.com";
      process.env.EMAIL_FROM_NAME = "Dilnova";
      process.env.SENTRY_DSN = "https://public@sentry.example.com/1";

      expect(() => validateServerEnv()).toThrow(
        "Preview deployments must not use the production DATABASE_URL",
      );
    });
  });
});
