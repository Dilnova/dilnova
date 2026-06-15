import { test, expect } from '@playwright/test';
import { NON_EXISTENT_UUID } from '../helpers/security-constants';
import { skipUnlessSuperadminSecurityEnv } from '../helpers/security-skip';
import { invokeServerAction, waitForServerActionManifest } from '../helpers/server-action';

test.beforeAll(async () => {
  await waitForServerActionManifest();
});

test.describe('Superadmin blocked from vendor org mutations without membership', () => {
  test.beforeEach(({ page }, testInfo) => {
    skipUnlessSuperadminSecurityEnv(testInfo);
  });

  test('cannot delete a vendor catalog product via vendor action', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=catalog',
      moduleFileSuffix: 'catalog/vendor.actions',
      exportName: 'deleteProductAction',
      args: [NON_EXISTENT_UUID],
    });

    expect(result.denied).toBe(true);
    expect(result.text).toMatch(/active organization|Not authorized|does not belong|Item not found/i);
  });

  test('cannot verify vendor orders without vendor org context', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'verifyOrderPaymentAction',
      args: [NON_EXISTENT_UUID],
    });

    expect(result.denied).toBe(true);
    expect(result.text).toMatch(/active organization|Only organization admins|Order not found|Not authorized/i);
  });
});

test.describe('Superadmin platform actions remain reachable', () => {
  test.beforeEach(({ page }, testInfo) => {
    skipUnlessSuperadminSecurityEnv(testInfo);
  });

  test('can invoke superadmin pricing action without auth rejection', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/superadmin',
      moduleFileSuffix: 'superadmin/actions',
      exportName: 'createPricingPlanAction',
      args: [
        {
          name: '',
          price: '',
          period: 'month',
          features: [],
          isPopular: false,
          buttonText: '',
          buttonLink: '/',
        },
      ],
    });

    expect(result.actionNotFound).toBe(false);
    expect(result.text).toMatch(/Name and Price are required|required/i);
    expect(result.text).not.toMatch(/global administrators|Only global administrators/i);
    expect(result.text).not.toMatch(/You must be signed in|Please sign in/i);
  });
});

test.describe('Superadmin cannot mutate org membership for arbitrary org without context', () => {
  test.beforeEach(({ page }, testInfo) => {
    skipUnlessSuperadminSecurityEnv(testInfo);
  });

  test('updateOrganizationMemberRole rejects foreign org context', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/admin',
      moduleFileSuffix: 'admin/actions',
      exportName: 'updateOrganizationMemberRole',
      args: ['org_e2e_foreign', 'user_e2e_foreign', 'org:member'],
    });

    expect(result.denied).toBe(true);
    expect(result.text).toMatch(/Only administrators|Not authorized|Invalid input/i);
  });
});
