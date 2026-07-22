import { test, expect } from "@playwright/test";
import {
  loadAnyProductId,
  loadSecurityFixtureContext,
  loadSecurityFixtures,
} from "../helpers/security-fixtures";
import { NON_EXISTENT_UUID } from "../helpers/security-constants";
import { skipUnlessSecurityEnv } from "../helpers/security-skip";
import {
  expectSecurityDenied,
  invokeServerAction,
  waitForServerActionManifest,
} from "../helpers/server-action";

let fixtures: Awaited<ReturnType<typeof loadSecurityFixtures>>;

test.beforeAll(async () => {
  await waitForServerActionManifest();
  const context = await loadSecurityFixtureContext();
  fixtures = context ? await loadSecurityFixtures(context) : null;
});

test.describe("Customer server-action IDOR", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, "customer", fixtures);
  });

  test("cannot initialize a payment slip upload for another customer order", async ({ page }) => {
    const orderId = fixtures!.foreignCustomerOrderId;

    const result = await invokeServerAction(page, {
      postPath: `/customer/invoice/${orderId}`,
      moduleFileSuffix: "orders/customer.actions",
      exportName: "createPaymentSlipUploadPresignedUrlAction",
      args: [{ orderId, fileName: "slip.png", fileSize: 1024, fileType: "image/png" }],
    });

    expectSecurityDenied(result);
  });

  test("cannot submit a payment slip path for another customer order", async ({ page }) => {
    const orderId = fixtures!.foreignCustomerOrderId;

    const result = await invokeServerAction(page, {
      postPath: `/customer/invoice/${orderId}`,
      moduleFileSuffix: "orders/customer.actions",
      exportName: "submitPaymentSlipPathAction",
      args: [{ orderId, storagePath: `orders/${orderId}/slip.png` }],
    });

    expectSecurityDenied(result);
  });

  test("cannot initialize a payment slip upload for a non-existent order", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/customer",
      moduleFileSuffix: "orders/customer.actions",
      exportName: "createPaymentSlipUploadPresignedUrlAction",
      args: [
        { orderId: NON_EXISTENT_UUID, fileName: "slip.png", fileSize: 1024, fileType: "image/png" },
      ],
    });

    expectSecurityDenied(result);
  });
});

test.describe("Customer invoice route IDOR", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, "customer", fixtures);
  });

  test("cannot view another customer invoice by URL", async ({ page }) => {
    await page.goto(`/customer/invoice/${fixtures!.foreignCustomerOrderId}`);
    await expect(page.getByRole("heading", { name: /INVOICE/i })).toHaveCount(0);
    await expect(page.getByText(/Page not found|404|Back to Portal/i).first()).toBeVisible();
  });
});

test.describe("Customer blocked from vendor/admin mutations", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, "customer");
  });

  test("cannot verify a vendor order payment", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=inventory&imsTab=orders",
      moduleFileSuffix: "orders/vendor.actions",
      exportName: "verifyOrderPaymentAction",
      args: [fixtures?.foreignVendorOrderId ?? NON_EXISTENT_UUID],
    });
    expectSecurityDenied(result);
  });

  test("cannot delete a vendor catalog product", async ({ page }) => {
    const productId = (await loadAnyProductId()) ?? NON_EXISTENT_UUID;

    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=catalog",
      moduleFileSuffix: "catalog/vendor.actions",
      exportName: "deleteProductAction",
      args: [productId],
    });
    expectSecurityDenied(result);
  });
});
