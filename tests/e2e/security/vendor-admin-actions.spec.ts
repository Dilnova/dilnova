import { test } from "@playwright/test";
import { loadSecurityFixtureContext, loadSecurityFixtures } from "../helpers/security-fixtures";
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

test.describe("Vendor admin cross-tenant server-action IDOR", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, "vendor-admin", fixtures);
  });

  test("cannot delete another vendor product", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=catalog",
      moduleFileSuffix: "catalog/vendor.actions",
      exportName: "deleteProductAction",
      args: [fixtures!.foreignVendorProductId],
    });
    expectSecurityDenied(result);
  });

  test("cannot verify payment for an order outside their org", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=inventory&imsTab=orders",
      moduleFileSuffix: "orders/vendor.actions",
      exportName: "verifyOrderPaymentAction",
      args: [fixtures!.foreignVendorOrderId],
    });
    expectSecurityDenied(result);
  });

  test("cannot cancel an order outside their org", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=inventory&imsTab=orders",
      moduleFileSuffix: "orders/vendor.actions",
      exportName: "cancelVendorOrderAction",
      args: [fixtures!.foreignVendorOrderId],
    });
    expectSecurityDenied(result);
  });

  test("cannot reject a payment slip for an order outside their org", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/vendor?tab=inventory&imsTab=orders",
      moduleFileSuffix: "orders/vendor.actions",
      exportName: "rejectPaymentSlipAction",
      args: [fixtures!.foreignVendorOrderId, "E2E cross-tenant reject"],
    });
    expectSecurityDenied(result);
  });
});

test.describe("Vendor admin blocked from platform admin mutations", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessSecurityEnv(testInfo, "vendor-admin");
  });

  test("cannot create a superadmin pricing plan", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/superadmin",
      moduleFileSuffix: "superadmin/actions",
      exportName: "createPricingPlanAction",
      args: [
        {
          name: "E2E Intrusion Plan",
          price: "999",
          period: "month",
          features: ["blocked"],
          isPopular: false,
          buttonText: "Blocked",
          buttonLink: "/",
        },
      ],
    });
    expectSecurityDenied(result);
  });

  test("cannot delete a product via superadmin action endpoint", async ({ page }) => {
    const result = await invokeServerAction(page, {
      postPath: "/superadmin",
      moduleFileSuffix: "catalog/superadmin.actions",
      exportName: "deleteProductAction",
      args: [fixtures?.foreignVendorProductId ?? NON_EXISTENT_UUID],
    });
    expectSecurityDenied(result);
  });
});
