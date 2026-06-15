import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { loadE2EEnv } from './tests/e2e/helpers/load-env';

loadE2EEnv();

const AUTH_DIR = path.join(__dirname, 'playwright/.clerk');
const PORT = process.env.PLAYWRIGHT_PORT ?? '3000';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

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
  ],
  webServer: {
    command: `node ./node_modules/next/dist/bin/next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
