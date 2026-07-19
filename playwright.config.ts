import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { loadE2EEnv } from './tests/e2e/helpers/load-env';

loadE2EEnv();

const AUTH_DIR = path.join(__dirname, 'playwright/.clerk');
const PORT = process.env.PLAYWRIGHT_PORT ?? '3000';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

const webServerEnv: Record<string, string> = {
  PORT,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://ci:ci@localhost:5432/ci',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  NEXT_PUBLIC_ENABLE_BETA_ACCESS: 'true',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? 'https://dummy.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? 'dummy-token',
  NEXT_PUBLIC_APP_URL: baseURL,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'ci_dummy',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? 'ci_dummy_api_key',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? 'ci_dummy_api_secret',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_dummy',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sb_service_dummy',
  PII_ENCRYPTION_KEY: process.env.PII_ENCRYPTION_KEY ?? 'placeholder_key_at_least_32_characters_long',
  HEALTH_CHECK_SECRET: process.env.HEALTH_CHECK_SECRET ?? 'placeholder',
  SMTP_USER: process.env.SMTP_USER ?? 'placeholder',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? 'placeholder',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS ?? 'info@example.com',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? 'Placeholder',
  SUPERADMIN_USER_IDS: process.env.SUPERADMIN_USER_IDS ?? 'user_placeholder',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET ?? 'whsec_placeholder',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY ?? '1x00000000000000000000AA',
};

export default defineConfig({
  testDir: path.join(__dirname, 'tests/e2e'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      dependencies: ['setup'],
      fullyParallel: false,
    },
    {
      name: 'public',
      testMatch: /rbac\/public-routes\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'unauthenticated',
      testMatch: /rbac\/unauthenticated\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'rbac-vendor-admin',
      testMatch: /rbac\/vendor-admin\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'vendor-admin.json'),
      },
    },
    {
      name: 'rbac-vendor-member',
      testMatch: /rbac\/vendor-member\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'vendor-member.json'),
      },
    },
    {
      name: 'rbac-customer',
      testMatch: /rbac\/customer\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'customer.json'),
      },
    },
    {
      name: 'rbac-superadmin',
      testMatch: /rbac\/superadmin\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'superadmin.json'),
      },
    },
    {
      name: 'security-unauthenticated',
      testMatch: /security\/unauthenticated-actions\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security-customer',
      testMatch: /security\/customer-idor\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'customer.json'),
      },
    },
    {
      name: 'security-vendor-member',
      testMatch: /security\/vendor-member-actions\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'vendor-member.json'),
      },
    },
    {
      name: 'security-vendor-admin',
      testMatch: /security\/vendor-admin-actions\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'vendor-admin.json'),
      },
    },
    {
      name: 'security-superadmin',
      testMatch: /security\/superadmin-actions\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'superadmin.json'),
      },
    },
    {
      name: 'business-customer',
      testMatch: /business\/checkout\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'customer.json'),
      },
    },
    {
      name: 'business-vendor',
      testMatch: /business\/pos-billing\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(AUTH_DIR, 'vendor-admin.json'),
      },
    },
  ],
  webServer: {
    // On CI we start Next.js in the workflow; reuse that server. Locally Playwright can start the server.
    command: process.env.CI
      ? `node ./node_modules/next/dist/bin/next start -H 127.0.0.1 --port ${PORT}`
      : `sh -c 'pnpm exec next build --webpack && exec node ./node_modules/next/dist/bin/next start -H 127.0.0.1 --port ${PORT}'`,
    url: baseURL,
    reuseExistingServer: process.env.CI ? true : false,
    timeout: 600_000,
    env: webServerEnv,
  },
});
