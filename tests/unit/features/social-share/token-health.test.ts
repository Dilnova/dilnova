import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isTokenExpiredError,
  inspectMetaToken,
  inspectPinterestToken,
  refreshFacebookPageTokenFromUserToken,
  refreshMetaUserToken,
  checkVendorSocialTokensHealth,
  refreshAndPersistSocialTokens,
  checkAllVendorsSocialTokenHealth,
} from "@/features/social-share/services/token-health";

// Mock http-client fetchWithTimeout
vi.mock("@/shared/security/http-client", () => ({
  fetchWithTimeout: vi.fn(),
  HTTP_TIMEOUT: { DEFAULT: 5000, EXTENDED: 15000 },
}));

// Mock verifyPinterestAccount from pinterest service
vi.mock("@/features/social-share/services/pinterest", () => ({
  verifyPinterestAccount: vi.fn(),
}));

// Mock logger
vi.mock("@/shared/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock db client
const mockUpdate = vi.fn();
const mockWhere = vi.fn();
const mockSet = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/shared/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          const res = mockWhere(...args);
          return {
            limit: (...lArgs: unknown[]) => mockLimit(...lArgs),
            then: (resolve: (val: unknown) => unknown, reject?: (err: unknown) => unknown) =>
              Promise.resolve(res ?? []).then(resolve, reject),
          };
        },
      }),
    }),
    update: () => ({
      set: (...args: unknown[]) => {
        mockSet(...args);
        return {
          where: (...wArgs: unknown[]) => mockUpdate(...wArgs),
        };
      },
    }),
  },
}));

import { fetchWithTimeout } from "@/shared/security/http-client";
import { verifyPinterestAccount } from "@/features/social-share/services/pinterest";

const mockedFetch = vi.mocked(fetchWithTimeout);
const mockedVerifyPinterest = vi.mocked(verifyPinterestAccount);

describe("features/social-share/services/token-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_SECRET;
  });

  describe("isTokenExpiredError", () => {
    it("detects Meta error code 190 as expired", () => {
      expect(isTokenExpiredError("OAuthException", 190)).toBe(true);
    });

    it("detects common token expiration text phrases", () => {
      expect(isTokenExpiredError("Error validating access token: Session has expired")).toBe(true);
      expect(isTokenExpiredError("Access token has expired on 2026-09-01")).toBe(true);
      expect(isTokenExpiredError("The access token could not be decrypted")).toBe(true);
      expect(isTokenExpiredError("Malformed access token")).toBe(true);
      expect(isTokenExpiredError("Pinterest Authentication Failed (HTTP 401)")).toBe(true);
    });

    it("returns false for non-auth errors", () => {
      expect(isTokenExpiredError("Rate limit reached for this IP")).toBe(false);
      expect(isTokenExpiredError("Network timeout connecting to server")).toBe(false);
      expect(isTokenExpiredError("")).toBe(false);
      expect(isTokenExpiredError(undefined)).toBe(false);
    });
  });

  describe("inspectMetaToken", () => {
    it("returns UNCONFIGURED for empty or masked tokens", async () => {
      const res1 = await inspectMetaToken("");
      expect(res1.status).toBe("UNCONFIGURED");
      expect(res1.isValid).toBe(false);

      const res2 = await inspectMetaToken("••••••••••••••••");
      expect(res2.status).toBe("UNCONFIGURED");
      expect(res2.isValid).toBe(false);
    });

    it("identifies permanent System User token (expires_at = 0)", async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            app_id: "123456",
            type: "SYSTEM_USER",
            is_valid: true,
            expires_at: 0,
            scopes: ["pages_manage_posts", "pages_read_engagement"],
          },
        }),
      } as unknown as Response);

      const res = await inspectMetaToken("system_user_token");
      expect(res.isValid).toBe(true);
      expect(res.isPermanent).toBe(true);
      expect(res.isExpired).toBe(false);
      expect(res.status).toBe("HEALTHY");
      expect(res.expiresInDays).toBeNull();
      expect(res.scopes).toEqual(["pages_manage_posts", "pages_read_engagement"]);
    });

    it("identifies healthy token with > 7 days remaining", async () => {
      const futureUnix = Math.floor(Date.now() / 1000) + 30 * 86400; // 30 days ahead
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            app_id: "123456",
            type: "USER",
            is_valid: true,
            expires_at: futureUnix,
            scopes: ["pages_manage_posts"],
          },
        }),
      } as unknown as Response);

      const res = await inspectMetaToken("user_token_30d");
      expect(res.isValid).toBe(true);
      expect(res.isPermanent).toBe(false);
      expect(res.status).toBe("HEALTHY");
      expect(res.expiresInDays).toBeGreaterThanOrEqual(29);
    });

    it("identifies expiring soon token (<= 7 days)", async () => {
      const expiringSoonUnix = Math.floor(Date.now() / 1000) + 3 * 86400; // 3 days ahead
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            app_id: "123456",
            type: "USER",
            is_valid: true,
            expires_at: expiringSoonUnix,
            scopes: ["pages_manage_posts"],
          },
        }),
      } as unknown as Response);

      const res = await inspectMetaToken("user_token_3d");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("EXPIRING_SOON");
      expect(res.expiresInDays).toBe(3);
      expect(res.errorMessage).toContain("expires in 3 day(s)");
    });

    it("identifies expired token (expires_at in the past)", async () => {
      const pastUnix = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            app_id: "123456",
            type: "USER",
            is_valid: true,
            expires_at: pastUnix,
            scopes: [],
          },
        }),
      } as unknown as Response);

      const res = await inspectMetaToken("expired_token");
      expect(res.isValid).toBe(false);
      expect(res.isExpired).toBe(true);
      expect(res.status).toBe("EXPIRED");
    });

    it("identifies revoked or invalid token (is_valid = false)", async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            is_valid: false,
            error: {
              code: 190,
              message: "Error validating access token: Session has expired",
            },
          },
        }),
      } as unknown as Response);

      const res = await inspectMetaToken("revoked_token");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("EXPIRED");
      expect(res.isExpired).toBe(true);
    });

    it("falls back to /me endpoint when debug_token fails", async () => {
      // 1st call to debug_token fails
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "debug_token restricted" } }),
      } as unknown as Response);

      // 2nd call to /me succeeds
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "page_or_user_123",
          name: "Test Store Admin",
          permissions: {
            data: [
              { permission: "pages_manage_posts", status: "granted" },
              { permission: "pages_read_engagement", status: "granted" },
            ],
          },
        }),
      } as unknown as Response);

      const res = await inspectMetaToken("valid_user_token");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("HEALTHY");
      expect(res.accountName).toBe("Test Store Admin");
      expect(res.scopes).toEqual(["pages_manage_posts", "pages_read_engagement"]);
    });
  });

  describe("inspectPinterestToken", () => {
    it("returns UNCONFIGURED for empty or masked token", async () => {
      const res = await inspectPinterestToken("");
      expect(res.status).toBe("UNCONFIGURED");
    });

    it("returns HEALTHY for valid token", async () => {
      mockedVerifyPinterest.mockResolvedValueOnce({
        success: true,
        user: { username: "dilnova_store", businessName: "Dilnova Decor" },
      });

      const res = await inspectPinterestToken("pina_valid_token");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("HEALTHY");
      expect(res.username).toBe("dilnova_store");
    });

    it("returns EXPIRED when verification fails with 401", async () => {
      mockedVerifyPinterest.mockResolvedValueOnce({
        success: false,
        error: "Pinterest Authentication Failed (HTTP 401)",
      });

      const res = await inspectPinterestToken("pina_expired_token");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("EXPIRED");
    });
  });

  describe("refreshFacebookPageTokenFromUserToken", () => {
    it("retrieves renewed page access token from Meta Graph API", async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "998877",
          name: "Dilnova Official",
          access_token: "new_page_token_abc123",
        }),
      } as unknown as Response);

      const res = await refreshFacebookPageTokenFromUserToken({
        userToken: "valid_user_token",
        pageId: "998877",
      });

      expect(res.success).toBe(true);
      expect(res.pageAccessToken).toBe("new_page_token_abc123");
      expect(res.pageName).toBe("Dilnova Official");
    });

    it("returns error when page access token is missing in response", async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "998877",
          name: "Dilnova Official",
          // missing access_token
        }),
      } as unknown as Response);

      const res = await refreshFacebookPageTokenFromUserToken({
        userToken: "restricted_user_token",
        pageId: "998877",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("without a page-scoped access token");
    });
  });

  describe("refreshMetaUserToken", () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns error if app credentials are not configured", async () => {
      delete process.env.META_APP_ID;
      delete process.env.META_APP_SECRET;
      delete process.env.FACEBOOK_APP_ID;
      delete process.env.FACEBOOK_APP_SECRET;

      const res = await refreshMetaUserToken("short_token");
      expect(res.success).toBe(false);
      expect(res.error).toContain("requires META_APP_ID and META_APP_SECRET");
    });

    it("exchanges short-lived token for long-lived token when app credentials exist", async () => {
      process.env.META_APP_ID = "app_123";
      process.env.META_APP_SECRET = "secret_456";

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "long_lived_60d_token",
          expires_in: 5184000,
        }),
      } as unknown as Response);

      const res = await refreshMetaUserToken("short_token");
      expect(res.success).toBe(true);
      expect(res.accessToken).toBe("long_lived_60d_token");
      expect(res.expiresIn).toBe(5184000);
    });
  });

  describe("checkVendorSocialTokensHealth", () => {
    it("returns UNCONFIGURED report if integration is null", async () => {
      const report = await checkVendorSocialTokensHealth(null);
      expect(report.overallStatus).toBe("UNCONFIGURED");
      expect(report.facebookPage.status).toBe("UNCONFIGURED");
      expect(report.metaCatalog.status).toBe("UNCONFIGURED");
    });

    it("compiles comprehensive health report for configured channels", async () => {
      // 1. Meta catalog debug_token
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            app_id: "123",
            type: "SYSTEM_USER",
            is_valid: true,
            expires_at: 0,
            scopes: ["catalog_management"],
          },
        }),
      } as unknown as Response);

      // 2. Facebook page debug_token
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            app_id: "123",
            type: "PAGE",
            is_valid: true,
            expires_at: 0,
            scopes: ["pages_manage_posts"],
          },
        }),
      } as unknown as Response);

      // 3. Facebook page direct verify
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "100200", name: "Dilnova Store Page" }),
      } as unknown as Response);

      const report = await checkVendorSocialTokensHealth({
        accessToken: "sys_token_xyz",
        facebookPageId: "100200",
        facebookPageAccessToken: "page_token_xyz",
      });

      expect(report.overallStatus).toBe("HEALTHY");
      expect(report.metaCatalog.status).toBe("HEALTHY");
      expect(report.facebookPage.status).toBe("HEALTHY");
      expect(report.facebookPage.accountName).toBe("Dilnova Store Page");
    });
  });

  describe("refreshAndPersistSocialTokens", () => {
    it("re-derives page access token from user token and updates database", async () => {
      const mockIntegration = {
        id: "intg_uuid_1",
        orgId: "org_123",
        accessToken: "healthy_user_token",
        facebookPageId: "page_123",
        facebookPageAccessToken: "expired_page_token",
        syncStatus: "connected",
        lastErrorMessage: null,
      };

      mockLimit.mockResolvedValueOnce([mockIntegration]);

      // 1. Check page token (expired)
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { is_valid: false, error: { code: 190, message: "Session expired" } },
        }),
      } as unknown as Response);

      // 2. Refresh page token from user token
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "page_123",
          name: "Fresh Store Page",
          access_token: "renewed_page_token_999",
        }),
      } as unknown as Response);

      // 3. Re-inspection: Meta user token
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { is_valid: true, expires_at: 0, scopes: [] },
        }),
      } as unknown as Response);

      // 4. Re-inspection: Page token
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { is_valid: true, expires_at: 0, scopes: [] },
        }),
      } as unknown as Response);

      // 5. Re-inspection: Page direct verify
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "page_123", name: "Fresh Store Page" }),
      } as unknown as Response);

      const result = await refreshAndPersistSocialTokens({
        orgId: "org_123",
      });

      expect(result.refreshedChannels).toContain("facebook_page_token");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          facebookPageAccessToken: "renewed_page_token_999",
        }),
      );
    });
  });

  describe("checkAllVendorsSocialTokenHealth", () => {
    it("iterates over active integrations and aggregates summary counts", async () => {
      // Mock db.select for active integrations
      const integrations = [
        {
          id: "intg_1",
          orgId: "org_1",
          accessToken: "sys_token_1",
          facebookPageId: "page_1",
          facebookPageAccessToken: "page_token_1",
          syncStatus: "connected",
        },
        {
          id: "intg_2",
          orgId: "org_2",
          accessToken: "sys_token_2",
          facebookPageId: "page_2",
          facebookPageAccessToken: "page_token_2",
          syncStatus: "connected",
        },
      ];

      mockLimit
        .mockResolvedValueOnce([integrations[0]]) // 1st refreshAndPersist
        .mockResolvedValueOnce([integrations[1]]); // 2nd refreshAndPersist

      // Mock select active integrations
      mockWhere.mockReturnValueOnce(integrations);

      // Provide mocks for token inspection inside refreshAndPersistSocialTokens
      mockedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { is_valid: true, expires_at: 0, scopes: [] },
        }),
      } as unknown as Response);

      const summary = await checkAllVendorsSocialTokenHealth();

      expect(summary.totalChecked).toBe(2);
      expect(summary.healthyCount).toBe(2);
      expect(summary.criticalCount).toBe(0);
    });
  });
});
