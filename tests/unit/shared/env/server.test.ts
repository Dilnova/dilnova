import { afterEach, describe, expect, it, vi } from 'vitest';

describe('validateServerEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('skips validation outside production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;

    const { validateServerEnv } = await import('@/shared/env/server');
    expect(() => validateServerEnv()).not.toThrow();
  });

  it('skips validation during production build phase', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PHASE = 'phase-production-build';
    delete process.env.DATABASE_URL;

    const { validateServerEnv } = await import('@/shared/env/server');
    expect(() => validateServerEnv()).not.toThrow();
  });

  it('throws in production runtime when required vars are missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PHASE;
    delete process.env.DATABASE_URL;
    delete process.env.CI;
    delete process.env.CLERK_SECRET_KEY;

    const { validateServerEnv } = await import('@/shared/env/server');
    expect(() => validateServerEnv()).toThrow('Server environment validation failed');
  });

  it('validates DATABASE_POOL_SIZE when present', async () => {
    const { productionServerEnvSchema } = await import('@/shared/env/server');

    const baseEnv = {
      DATABASE_URL: 'postgres://...',
      PII_ENCRYPTION_KEY: 'key',
      CLERK_SECRET_KEY: 'key',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'key',
      NEXT_PUBLIC_APP_URL: 'https://example.com',
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'cloud',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.com',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key',
      SUPABASE_SERVICE_ROLE_KEY: 'key',
      UPSTASH_REDIS_REST_URL: 'https://upstash.com',
      UPSTASH_REDIS_REST_TOKEN: 'token',
      HEALTH_CHECK_SECRET: 'secret',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'password',
      EMAIL_FROM_ADDRESS: 'sender@example.com',
      EMAIL_FROM_NAME: 'sender',
      SUPERADMIN_USER_IDS: '123',
      CLERK_WEBHOOK_SECRET: 'secret',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'sitekey',
      TURNSTILE_SECRET_KEY: 'secret',
      SENTRY_DSN: 'https://public@sentry.example.com/1',
      QSTASH_TOKEN: 'token',
    };

    // Valid cases
    expect(productionServerEnvSchema.safeParse({ ...baseEnv, DATABASE_POOL_SIZE: '10' }).success).toBe(true);
    expect(productionServerEnvSchema.safeParse({ ...baseEnv, DATABASE_POOL_SIZE: undefined }).success).toBe(true);

    // Invalid cases
    const parseInvalid = (val: string) => {
      const res = productionServerEnvSchema.safeParse({ ...baseEnv, DATABASE_POOL_SIZE: val });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.flatten().fieldErrors.DATABASE_POOL_SIZE).toEqual(['DATABASE_POOL_SIZE must be a positive integer']);
      }
    };

    parseInvalid('0');
    parseInvalid('-5');
    parseInvalid('abc');
    parseInvalid('5.5');
  });

  it('validates SENTRY_TRACES_SAMPLE_RATE when present', async () => {
    const { productionServerEnvSchema } = await import('@/shared/env/server');

    const baseEnv = {
      DATABASE_URL: 'postgres://...',
      PII_ENCRYPTION_KEY: 'key',
      CLERK_SECRET_KEY: 'key',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'key',
      NEXT_PUBLIC_APP_URL: 'https://example.com',
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'cloud',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.com',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key',
      SUPABASE_SERVICE_ROLE_KEY: 'key',
      UPSTASH_REDIS_REST_URL: 'https://upstash.com',
      UPSTASH_REDIS_REST_TOKEN: 'token',
      HEALTH_CHECK_SECRET: 'secret',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'password',
      EMAIL_FROM_ADDRESS: 'sender@example.com',
      EMAIL_FROM_NAME: 'sender',
      SUPERADMIN_USER_IDS: '123',
      CLERK_WEBHOOK_SECRET: 'secret',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'sitekey',
      TURNSTILE_SECRET_KEY: 'secret',
      SENTRY_DSN: 'https://public@sentry.example.com/1',
      QSTASH_TOKEN: 'token',
    };

    // Valid cases
    expect(productionServerEnvSchema.safeParse({ ...baseEnv, SENTRY_TRACES_SAMPLE_RATE: '0.1' }).success).toBe(true);
    expect(productionServerEnvSchema.safeParse({ ...baseEnv, SENTRY_TRACES_SAMPLE_RATE: '0' }).success).toBe(true);
    expect(productionServerEnvSchema.safeParse({ ...baseEnv, SENTRY_TRACES_SAMPLE_RATE: '1' }).success).toBe(true);
    expect(productionServerEnvSchema.safeParse({ ...baseEnv, SENTRY_TRACES_SAMPLE_RATE: undefined }).success).toBe(true);

    // Invalid cases
    const parseInvalid = (val: string) => {
      const res = productionServerEnvSchema.safeParse({ ...baseEnv, SENTRY_TRACES_SAMPLE_RATE: val });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.flatten().fieldErrors.SENTRY_TRACES_SAMPLE_RATE).toEqual(['SENTRY_TRACES_SAMPLE_RATE must be a float between 0 and 1']);
      }
    };

    parseInvalid('-0.1');
    parseInvalid('1.1');
    parseInvalid('abc');
  });
});
