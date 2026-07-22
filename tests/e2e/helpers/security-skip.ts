import type { TestInfo } from "@playwright/test";
import { authStateExists, hasClerkApiKeys, hasRoleTestUsers } from "./env";
import type { SecurityFixtures } from "./security-fixtures";

type RoleKey = "customer" | "vendor-admin" | "vendor-member" | "superadmin";

export function skipUnlessSecurityEnv(
  test: TestInfo,
  role: RoleKey,
  fixtures?: SecurityFixtures | null,
): void {
  if (!hasClerkApiKeys()) {
    test.skip(true, "CLERK_SECRET_KEY / publishable key missing.");
    return;
  }

  if (!authStateExists(role)) {
    test.skip(true, `Run auth.setup with the matching E2E_* email for ${role}.`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    test.skip(true, "DATABASE_URL missing — security fixture queries require a database.");
    return;
  }

  if (fixtures === null) {
    test.skip(
      true,
      "Insufficient seeded data for cross-tenant IDOR checks (need orders/products from multiple tenants).",
    );
  }
}

export function skipUnlessUnauthenticatedSecurityEnv(test: TestInfo): void {
  if (!hasClerkApiKeys()) {
    test.skip(true, "CLERK_SECRET_KEY / publishable key missing.");
    return;
  }
}

export function skipUnlessSuperadminSecurityEnv(test: TestInfo): void {
  skipUnlessSecurityEnv(test, "superadmin");
}

export function skipUnlessFullSecurityMatrix(test: TestInfo): void {
  if (!hasRoleTestUsers()) {
    test.skip(true, "Set all E2E_* emails in .env.local for full security matrix.");
  }
}
