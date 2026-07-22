import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isSuperAdminUser,
  readSuperAdminGrant,
  SUPERADMIN_PLATFORM_ROLE,
} from "@/shared/auth/superadmin.server";

describe("superadmin.server", () => {
  const originalAllowlist = process.env.SUPERADMIN_USER_IDS;

  beforeEach(() => {
    delete process.env.SUPERADMIN_USER_IDS;
  });

  afterEach(() => {
    if (originalAllowlist) {
      process.env.SUPERADMIN_USER_IDS = originalAllowlist;
    } else {
      delete process.env.SUPERADMIN_USER_IDS;
    }
  });

  it("grants access when BOTH Clerk privateMetadata is correct and user ID is listed in environment allowlist", () => {
    process.env.SUPERADMIN_USER_IDS = "user_1,user_2";

    expect(
      isSuperAdminUser({
        id: "user_1",
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
        publicMetadata: { role: "customer" },
      }),
    ).toBe(true);

    expect(
      readSuperAdminGrant({
        id: "user_1",
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
      }),
    ).toEqual({ granted: true, source: "dual_gate" });
  });

  it("denies access when user has Clerk privateMetadata but is NOT in environment allowlist", () => {
    process.env.SUPERADMIN_USER_IDS = "user_other";

    expect(
      isSuperAdminUser({
        id: "user_1",
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
        publicMetadata: { role: "customer" },
      }),
    ).toBe(false);

    expect(
      readSuperAdminGrant({
        id: "user_1",
        privateMetadata: { platformRole: SUPERADMIN_PLATFORM_ROLE },
      }),
    ).toEqual({ granted: false, source: null });
  });

  it("denies access when user is in environment allowlist but lacks Clerk privateMetadata", () => {
    process.env.SUPERADMIN_USER_IDS = "user_1";

    expect(
      isSuperAdminUser({
        id: "user_1",
        privateMetadata: {},
        publicMetadata: {},
      }),
    ).toBe(false);
  });

  it("denies legacy publicMetadata.role=admin", () => {
    process.env.SUPERADMIN_USER_IDS = "user_legacy";

    expect(
      isSuperAdminUser({
        id: "user_legacy",
        publicMetadata: { role: "admin" },
        privateMetadata: {},
      }),
    ).toBe(false);
  });

  it("denies regular customers and vendors", () => {
    process.env.SUPERADMIN_USER_IDS = "user_customer,user_vendor";

    expect(
      isSuperAdminUser({
        id: "user_customer",
        publicMetadata: { role: "customer" },
        privateMetadata: {},
      }),
    ).toBe(false);

    expect(
      isSuperAdminUser({
        id: "user_vendor",
        publicMetadata: { role: "vendor" },
        privateMetadata: {},
      }),
    ).toBe(false);
  });
});
