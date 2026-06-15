import fs from 'node:fs';
import path from 'node:path';
import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import { test as setup, expect } from '@playwright/test';
import {
  authStatePath,
  getRoleTestEmail,
  hasClerkApiKeys,
} from './helpers/env';
import { loadE2EEnv } from './helpers/load-env';
import { PROTECTED_ROUTES, UNAUTHORIZED_PATH } from './helpers/routes';
import { getOrgRoleForEmail, getPrimaryOrgIdForEmail } from './helpers/clerk-auth';

setup.describe.configure({ mode: 'serial' });
setup.setTimeout(120_000);

type RoleKey = 'vendor-admin' | 'vendor-member' | 'customer' | 'superadmin';

interface RoleConfig {
  key: RoleKey;
  emailEnv: 'vendorAdmin' | 'vendorMember' | 'customer' | 'superadmin';
  probePath: string;
  requiresOrg?: boolean;
  expectedOrgRole?: 'org:admin' | 'org:member';
}

const EMPTY_STORAGE = { cookies: [] as unknown[], origins: [] as unknown[] };

const ROLES: RoleConfig[] = [
  {
    key: 'vendor-admin',
    emailEnv: 'vendorAdmin',
    probePath: PROTECTED_ROUTES.vendor,
    requiresOrg: true,
    expectedOrgRole: 'org:admin',
  },
  {
    key: 'vendor-member',
    emailEnv: 'vendorMember',
    probePath: PROTECTED_ROUTES.vendor,
    requiresOrg: true,
    expectedOrgRole: 'org:member',
  },
  { key: 'customer', emailEnv: 'customer', probePath: PROTECTED_ROUTES.customer },
  { key: 'superadmin', emailEnv: 'superadmin', probePath: PROTECTED_ROUTES.superadmin },
];

async function activateOrganization(page: import('@playwright/test').Page, orgId: string): Promise<void> {
  await page.evaluate(async (organizationId) => {
    await window.Clerk.setActive({ organization: organizationId });
  }, orgId);
}

setup.beforeAll(async () => {
  loadE2EEnv();
  fs.mkdirSync(path.dirname(authStatePath('customer')), { recursive: true });
  for (const role of ROLES) {
    fs.writeFileSync(authStatePath(role.key), JSON.stringify(EMPTY_STORAGE));
  }
});

setup('prepare authenticated storage states', async ({ browser }) => {
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

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await setupClerkTestingToken({ page });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await clerk.loaded({ page });
      await clerk.signIn({ page, emailAddress: email });

      if (role.requiresOrg) {
        const orgId = await getPrimaryOrgIdForEmail(email);
        const orgRole = await getOrgRoleForEmail(email);

        if (!orgId) {
          throw new Error(
            `E2E user for ${role.key} (${email}) has no Clerk organization. Add them to a vendor org.`,
          );
        }

        if (role.expectedOrgRole && orgRole !== role.expectedOrgRole) {
          throw new Error(
            `E2E user for ${role.key} (${email}) has role ${orgRole ?? 'none'}, expected ${role.expectedOrgRole}.`,
          );
        }

        await activateOrganization(page, orgId);
      }

      await page.goto(role.probePath, { waitUntil: 'domcontentloaded' });

      const unauthorizedPattern = new RegExp(`${UNAUTHORIZED_PATH.replace('/', '\\/')}$`);
      if (unauthorizedPattern.test(page.url())) {
        throw new Error(
          `Auth setup failed for ${role.key} (${email}) at ${role.probePath}. ` +
            (role.requiresOrg
              ? 'Ensure the user has the correct org role and an active organization.'
              : role.key === 'superadmin'
                ? 'Set publicMetadata.role = "admin" on this Clerk user.'
                : 'Ensure this user can access the customer portal.'),
        );
      }

      await expect(page).not.toHaveURL(unauthorizedPattern);
      await context.storageState({ path: authStatePath(role.key) });
    } finally {
      await context.close();
    }
  }
});
