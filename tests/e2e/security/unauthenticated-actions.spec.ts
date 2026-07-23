import { test, expect } from "@playwright/test";
import { NON_EXISTENT_UUID } from "../helpers/security-constants";
import { loadAnyProductId } from "../helpers/security-fixtures";
import { skipUnlessUnauthenticatedSecurityEnv } from "../helpers/security-skip";
import { invokeServerAction, waitForServerActionManifest } from "../helpers/server-action";

test.beforeAll(async () => {
  await waitForServerActionManifest();
});

test.describe("Unauthenticated server-action hardening", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessUnauthenticatedSecurityEnv(testInfo);
  });

  test("cannot delete a vendor product", async ({ page }) => {
    const productId = (await loadAnyProductId()) ?? NON_EXISTENT_UUID;

    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=catalog",
      moduleFileSuffix: "catalog/vendor.actions",
      exportName: "deleteProductAction",
      args: [productId],
    });

    expect(result.denied).toBe(true);
  });

  test("cannot verify an order payment", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=inventory&imsTab=orders",
      moduleFileSuffix: "orders/vendor.actions",
      exportName: "verifyOrderPaymentAction",
      args: [NON_EXISTENT_UUID],
    });

    expect(result.denied).toBe(true);
  });

  test("cannot create a superadmin pricing plan", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/superadmin",
      moduleFileSuffix: "superadmin/actions",
      exportName: "createPricingPlanAction",
      args: [
        {
          name: "E2E Guest Plan",
          price: "0",
          period: "month",
          features: ["blocked"],
          isPopular: false,
          buttonText: "Blocked",
          buttonLink: "/",
        },
      ],
    });

    expect(result.denied).toBe(true);
  });

  test("cannot initialize a payment slip upload", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/customer",
      moduleFileSuffix: "orders/customer.actions",
      exportName: "createPaymentSlipUploadPresignedUrlAction",
      args: [
        { orderId: NON_EXISTENT_UUID, fileName: "slip.png", fileSize: 1024, fileType: "image/png" },
      ],
    });

    expect(result.denied).toBe(true);
    expect(result.text).not.toMatch(/"success"\s*:\s*true/i);
  });
});
