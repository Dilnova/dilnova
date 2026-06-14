import fs from 'node:fs';
import path from 'node:path';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { test as setup, expect } from '@playwright/test';
import {
  authStatePath,
  getRoleTestEmail,
  hasClerkApiKeys,
} from './helpers/env';
import { loadE2EEnv } from './helpers/load-env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from './helpers/routes';

setup.describe.configure({ mode: 'serial' });

type RoleKey = 'vendor-admin' | 'vendor-member' | 'customer' | 'superadmin';

interface RoleConfig {
  key: RoleKey;
  emailEnv: 'vendorAdmin' | 'vendorMember' | 'customer' | 'superadmin';
  probePath: string;
}

const EMPTY_STORAGE = { cookies: [] as unknown[], origins: [] as unknown[] };

const ROLES: RoleConfig[] = [
  { key: 'vendor-admin', emailEnv: 'vendorAdmin', probePath: PROTECTED_ROUTES.vendor },
  { key: 'vendor-member', emailEnv: 'vendorMember', probePath: PROTECTED_ROUTES.vendor },
  { key: 'customer', emailEnv: 'customer', probePath: PROTECTED_ROUTES.customer },
  { key: 'superadmin', emailEnv: 'superadmin', probePath: PROTECTED_ROUTES.superadmin },
];

setup.beforeAll(async () => {
  loadE2EEnv();
  fs.mkdirSync(path.dirname(authStatePath('customer')), { recursive: true });
  for (const role of ROLES) {
    fs.writeFileSync(authStatePath(role.key), JSON.stringify(EMPTY_STORAGE));
  }
});

setup('prepare authenticated storage states', async ({ page }) => {
  loadE2EEnv();

  if (!hasClerkApiKeys()) {
    setup.skip(true, 'CLERK_SECRET_KEY / publishable key missing — authenticated RBAC suites will skip.');
    return;
  }

  try {
    await clerkSetup();
  } catch {
    setup.skip(true, 'Clerk testing token unavailable — authenticated RBAC suites will skip.');
    return;
  }

  for (const role of ROLES) {
    const email = getRoleTestEmail(role.emailEnv);
    if (!email) {
      continue;
    }

    await page.goto('/');
    await clerk.loaded({ page });
    await clerk.signIn({ page, emailAddress: email });

    await page.goto(role.probePath);
    await expect(page).not.toHaveURL(new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`));

    await page.context().storageState({ path: authStatePath(role.key) });
  }
});
