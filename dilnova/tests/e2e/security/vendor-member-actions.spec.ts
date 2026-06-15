import { test, expect } from '@playwright/test';
import {
  loadSecurityFixtureContext,
  loadSecurityFixtures,
} from '../helpers/security-fixtures';
import { NON_EXISTENT_UUID } from '../helpers/security-constants';
import { skipUnlessSecurityEnv } from '../helpers/security-skip';
import { invokeServerAction, waitForServerActionManifest } from '../helpers/server-action';

let fixtures: Awaited<ReturnType<typeof loadSecurityFixtures>>;

test.beforeAll(async () => {
  await waitForServerActionManifest();
  const context = await loadSecurityFixtureContext();
  fixtures = context ? await loadSecurityFixtures(context) : null;
});

test.describe('Vendor member server-action restrictions', () => {
  test.beforeEach(({ page }, testInfo) => {
    skipUnlessSecurityEnv(testInfo, 'vendor-member', fixtures);
  });

  test('cannot delete a product in their org', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=catalog',
      moduleFileSuffix: 'catalog/vendor.actions',
      exportName: 'deleteProductAction',
      args: [NON_EXISTENT_UUID],
    });

    expect(result.denied).toBe(true);
    expect(result.text).toMatch(/Only administrators|not belong|Item not found/i);
  });

  test('cannot verify an order payment', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'verifyOrderPaymentAction',
      args: [fixtures!.foreignVendorOrderId],
    });

    expect(result.denied).toBe(true);
    expect(result.text).toMatch(/Only organization admins|does not include items|Order not found/i);
  });

  test('cannot cancel a vendor order', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'cancelVendorOrderAction',
      args: [fixtures!.foreignVendorOrderId],
    });

    expect(result.denied).toBe(true);
    expect(result.text).toMatch(/Only organization admins|does not include items|Order not found/i);
  });

  test('cannot reject a payment slip', async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: '/vendor?tab=inventory&imsTab=orders',
      moduleFileSuffix: 'orders/vendor.actions',
      exportName: 'rejectPaymentSlipAction',
      args: [fixtures!.foreignVendorOrderId, 'E2E rejection attempt'],
    });

    expect(result.denied).toBe(true);
    expect(result.text).toMatch(/Only organization admins|does not include items|Order not found/i);
  });
});
