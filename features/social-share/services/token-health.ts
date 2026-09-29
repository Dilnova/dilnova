import { fetchWithTimeout, HTTP_TIMEOUT } from "@/shared/security/http-client";
import { logger } from "@/shared/logging/logger";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { META_GRAPH_API_VERSION } from "./facebook-feed";
import { verifyPinterestAccount } from "./pinterest";

export type TokenHealthStatus =
  | "HEALTHY"
  | "EXPIRING_SOON" // <= 7 days until expiration
  | "EXPIRED"
  | "INVALID"
  | "UNCONFIGURED";

export interface ChannelTokenHealth {
  channel: "facebook_page" | "meta_catalog" | "instagram" | "pinterest";
  status: TokenHealthStatus;
  isConfigured: boolean;
  isValid: boolean;
  isPermanent: boolean;
  expiresAt: string | null; // ISO string or null
  expiresInDays: number | null; // null if permanent/unconfigured
  scopes: string[];
  accountName?: string;
  accountId?: string;
  errorMessage?: string;
  canRefresh: boolean;
  lastCheckedAt: string;
}

export interface SocialTokensHealthReport {
  overallStatus: "HEALTHY" | "WARNING" | "CRITICAL" | "UNCONFIGURED";
  checkedAt: string;
  facebookPage: ChannelTokenHealth;
  metaCatalog: ChannelTokenHealth;
  instagram: ChannelTokenHealth;
  pinterest: ChannelTokenHealth;
  actionsNeeded: string[];
  canAutoRefresh: boolean;
}

export interface MetaTokenDebugData {
  app_id?: string;
  type?: string;
  application?: string;
  data_access_expires_at?: number;
  expires_at?: number;
  is_valid?: boolean;
  issued_at?: number;
  scopes?: string[];
  user_id?: string;
  profile_id?: string;
  error?: {
    code: number;
    message: string;
    subcode?: number;
  };
}

/**
 * Checks whether an error code or message from Meta or Pinterest represents an expired token.
 */
export function isTokenExpiredError(
  errorMsg?: string,
  errorCode?: number,
  errorSubcode?: number,
): boolean {
  if (errorCode === 190) {
    // 463: Session expired, 467: Access token expired
    return true;
  }
  if (!errorMsg) return false;
  const msg = errorMsg.toLowerCase();
  return (
    msg.includes("session has expired") ||
    msg.includes("error validating access token") ||
    msg.includes("access token has expired") ||
    msg.includes("token has expired") ||
    msg.includes("the access token could not be decrypted") ||
    msg.includes("malformed access token") ||
    msg.includes("authentication failed") ||
    msg.includes("http 401") ||
    msg.includes("code 190")
  );
}

/**
 * Inspects a Meta token (User, System User, or Page token) via the Meta Graph API.
 * Uses /debug_token if possible, with automatic fallback to /me.
 */
export async function inspectMetaToken(
  token: string,
  options?: { appId?: string; appSecret?: string },
): Promise<{
  isValid: boolean;
  isPermanent: boolean;
  isExpired: boolean;
  status: TokenHealthStatus;
  expiresAt: Date | null;
  expiresInDays: number | null;
  scopes: string[];
  tokenType?: string;
  accountName?: string;
  accountId?: string;
  errorMessage?: string;
}> {
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.includes("••••")) {
    return {
      isValid: false,
      isPermanent: false,
      isExpired: false,
      status: "UNCONFIGURED",
      expiresAt: null,
      expiresInDays: null,
      scopes: [],
    };
  }

  const nowMs = Date.now();

  try {
    // 1. Try inspecting via debug_token endpoint
    const appId = options?.appId || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
    const appSecret =
      options?.appSecret || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    const inspectorToken = appId && appSecret ? `${appId}|${appSecret}` : cleanToken;

    const debugUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/debug_token?input_token=${encodeURIComponent(
      cleanToken,
    )}&access_token=${encodeURIComponent(inspectorToken)}`;

    const debugRes = await fetchWithTimeout(debugUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: HTTP_TIMEOUT.DEFAULT,
    });

    const debugJson = await debugRes.json();
    const data: MetaTokenDebugData | undefined = debugJson?.data;

    if (debugRes.ok && data) {
      if (data.is_valid === false || data.error) {
        const isExp = isTokenExpiredError(
          data.error?.message,
          data.error?.code,
          data.error?.subcode,
        );
        return {
          isValid: false,
          isPermanent: false,
          isExpired: isExp,
          status: isExp ? "EXPIRED" : "INVALID",
          expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : null,
          expiresInDays: 0,
          scopes: data.scopes || [],
          errorMessage: data.error?.message || "Invalid Meta access token.",
        };
      }

      // expires_at === 0 means permanent token (e.g. System User token or derived Page token)
      const expiresAtUnix = data.expires_at ?? 0;
      const isPermanent = expiresAtUnix === 0;

      if (isPermanent) {
        return {
          isValid: true,
          isPermanent: true,
          isExpired: false,
          status: "HEALTHY",
          expiresAt: null,
          expiresInDays: null,
          scopes: data.scopes || [],
          tokenType: data.type,
          accountId: data.user_id || data.profile_id,
        };
      }

      const expiresAtDate = new Date(expiresAtUnix * 1000);
      const remainingSeconds = expiresAtUnix - Math.floor(nowMs / 1000);
      const remainingDays = Math.max(0, Math.floor(remainingSeconds / 86400));

      if (remainingSeconds <= 0) {
        return {
          isValid: false,
          isPermanent: false,
          isExpired: true,
          status: "EXPIRED",
          expiresAt: expiresAtDate,
          expiresInDays: 0,
          scopes: data.scopes || [],
          tokenType: data.type,
          errorMessage: `Meta access token expired on ${expiresAtDate.toISOString().slice(0, 10)}.`,
        };
      }

      if (remainingDays <= 7) {
        return {
          isValid: true,
          isPermanent: false,
          isExpired: false,
          status: "EXPIRING_SOON",
          expiresAt: expiresAtDate,
          expiresInDays: remainingDays,
          scopes: data.scopes || [],
          tokenType: data.type,
          errorMessage: `Token expires in ${remainingDays} day(s) on ${expiresAtDate.toISOString().slice(0, 10)}.`,
        };
      }

      return {
        isValid: true,
        isPermanent: false,
        isExpired: false,
        status: "HEALTHY",
        expiresAt: expiresAtDate,
        expiresInDays: remainingDays,
        scopes: data.scopes || [],
        tokenType: data.type,
      };
    }

    // 2. Fallback: inspect via /me if /debug_token requires app credentials or failed
    const meUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me?fields=id,name,permissions&access_token=${encodeURIComponent(
      cleanToken,
    )}`;

    const meRes = await fetchWithTimeout(meUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: HTTP_TIMEOUT.DEFAULT,
    });

    const meData = await meRes.json();

    if (!meRes.ok || meData.error) {
      const err = meData.error;
      const isExp = isTokenExpiredError(err?.message, err?.code, err?.error_subcode);
      return {
        isValid: false,
        isPermanent: false,
        isExpired: isExp,
        status: isExp ? "EXPIRED" : "INVALID",
        expiresAt: null,
        expiresInDays: null,
        scopes: [],
        errorMessage: err?.message || "Failed to validate Meta access token.",
      };
    }

    const grantedScopes = (meData.permissions?.data || [])
      .filter((p: { permission: string; status: string }) => p.status === "granted")
      .map((p: { permission: string }) => p.permission);

    return {
      isValid: true,
      isPermanent: false, // cannot determine exact TTL from /me alone without debug_token
      isExpired: false,
      status: "HEALTHY",
      expiresAt: null,
      expiresInDays: null,
      scopes: grantedScopes,
      accountName: meData.name,
      accountId: meData.id,
    };
  } catch (error) {
    logger.warn("[TokenHealth] Network or parsing error during Meta token inspection", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      isValid: false,
      isPermanent: false,
      isExpired: false,
      status: "INVALID",
      expiresAt: null,
      expiresInDays: null,
      scopes: [],
      errorMessage:
        error instanceof Error ? error.message : "Failed to verify Meta token with API.",
    };
  }
}

/**
 * Inspects a Pinterest API v5 access token.
 */
export async function inspectPinterestToken(token: string): Promise<{
  isValid: boolean;
  status: TokenHealthStatus;
  username?: string;
  errorMessage?: string;
}> {
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.includes("••••")) {
    return {
      isValid: false,
      status: "UNCONFIGURED",
    };
  }

  const res = await verifyPinterestAccount(cleanToken);

  if (res.success && res.user) {
    return {
      isValid: true,
      status: "HEALTHY",
      username: res.user.username,
    };
  }

  const isExp = isTokenExpiredError(res.error);
  return {
    isValid: false,
    status: isExp ? "EXPIRED" : "INVALID",
    errorMessage: res.error || "Pinterest access token failed validation.",
  };
}

/**
 * Automatically fetches a fresh Facebook Page Access Token from the user/system token.
 * When derived from a long-lived user token or system user token, the page token never expires.
 */
export async function refreshFacebookPageTokenFromUserToken({
  userToken,
  pageId,
}: {
  userToken: string;
  pageId: string;
}): Promise<{
  success: boolean;
  pageAccessToken?: string;
  pageName?: string;
  error?: string;
}> {
  try {
    const cleanPageId = pageId.trim().replace(/[^0-9]/g, "");
    const cleanUserToken = userToken.trim();

    if (!cleanPageId || !cleanUserToken) {
      return { success: false, error: "Page ID and User Token are required for renewal." };
    }

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${cleanPageId}?fields=id,name,access_token&access_token=${encodeURIComponent(
      cleanUserToken,
    )}`;

    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: HTTP_TIMEOUT.DEFAULT,
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Failed to refresh page token (HTTP ${res.status})`,
      };
    }

    if (!data.access_token) {
      return {
        success: false,
        error:
          "Facebook responded without a page-scoped access token. Ensure user has MANAGE permissions for this page.",
      };
    }

    return {
      success: true,
      pageAccessToken: data.access_token,
      pageName: data.name,
    };
  } catch (error) {
    logger.warn("[TokenHealth] Failed refreshing page token from user token", { error, pageId });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error contacting Meta to refresh page token.",
    };
  }
}

/**
 * Exchanges a short-lived Meta user token for a 60-day long-lived token via Meta OAuth endpoint.
 */
export async function refreshMetaUserToken(
  shortLivedToken: string,
  options?: { appId?: string; appSecret?: string },
): Promise<{
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  try {
    const cleanToken = shortLivedToken.trim();
    const appId = options?.appId || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
    const appSecret =
      options?.appSecret || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return {
        success: false,
        error:
          "Automatic user token exchange requires META_APP_ID and META_APP_SECRET to be configured in server environment.",
      };
    }

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
      appId,
    )}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(
      cleanToken,
    )}`;

    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: HTTP_TIMEOUT.DEFAULT,
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Token exchange failed (HTTP ${res.status})`,
      };
    }

    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    logger.warn("[TokenHealth] Error exchanging Meta token", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to exchange Meta user token.",
    };
  }
}

/**
 * Evaluates the full social token health status across all configured channels for a vendor.
 */
export async function checkVendorSocialTokensHealth(
  integration: Partial<typeof schema.metaCatalogIntegrations.$inferSelect> | null,
): Promise<SocialTokensHealthReport> {
  const nowIso = new Date().toISOString();

  if (!integration) {
    const unconfigured = (channel: ChannelTokenHealth["channel"]): ChannelTokenHealth => ({
      channel,
      status: "UNCONFIGURED",
      isConfigured: false,
      isValid: false,
      isPermanent: false,
      expiresAt: null,
      expiresInDays: null,
      scopes: [],
      canRefresh: false,
      lastCheckedAt: nowIso,
    });

    return {
      overallStatus: "UNCONFIGURED",
      checkedAt: nowIso,
      facebookPage: unconfigured("facebook_page"),
      metaCatalog: unconfigured("meta_catalog"),
      instagram: unconfigured("instagram"),
      pinterest: unconfigured("pinterest"),
      actionsNeeded: [
        "Configure social channels in Settings > Social to enable automated publishing.",
      ],
      canAutoRefresh: false,
    };
  }

  const actionsNeeded: string[] = [];

  // 1. Check Meta Catalog / System User Token
  const catalogToken = integration.accessToken || "";
  const catalogHealth = await inspectMetaToken(catalogToken);
  const metaCatalogChannel: ChannelTokenHealth = {
    channel: "meta_catalog",
    status: catalogHealth.status,
    isConfigured: Boolean(catalogToken && !catalogToken.includes("••••")),
    isValid: catalogHealth.isValid,
    isPermanent: catalogHealth.isPermanent,
    expiresAt: catalogHealth.expiresAt ? catalogHealth.expiresAt.toISOString() : null,
    expiresInDays: catalogHealth.expiresInDays,
    scopes: catalogHealth.scopes,
    accountName: catalogHealth.accountName,
    accountId: catalogHealth.accountId,
    errorMessage: catalogHealth.errorMessage,
    canRefresh: Boolean(
      catalogHealth.isValid &&
      !catalogHealth.isPermanent &&
      (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID),
    ),
    lastCheckedAt: nowIso,
  };

  if (metaCatalogChannel.status === "EXPIRED") {
    actionsNeeded.push(
      "Meta User Token has expired. Generate a new System User Token in Meta Business Suite.",
    );
  } else if (metaCatalogChannel.status === "EXPIRING_SOON") {
    actionsNeeded.push(
      `Meta User Token expires in ${metaCatalogChannel.expiresInDays} day(s). Refresh token before it lapses.`,
    );
  }

  // 2. Check Facebook Page Feed Token
  const pageToken = integration.facebookPageAccessToken || integration.accessToken || "";
  const pageId = integration.facebookPageId || "";
  let pageHealth = await inspectMetaToken(pageToken);

  // If pageId is set, verify page access directly
  if (pageId && pageHealth.isValid) {
    try {
      const pageVerifyUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pageId.trim().replace(/[^0-9]/g, "")}?fields=id,name&access_token=${encodeURIComponent(
        pageToken,
      )}`;
      const pRes = await fetchWithTimeout(pageVerifyUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        timeoutMs: HTTP_TIMEOUT.DEFAULT,
      });
      const pData = await pRes.json();
      if (!pRes.ok || pData.error) {
        pageHealth = {
          ...pageHealth,
          isValid: false,
          status: isTokenExpiredError(pData.error?.message) ? "EXPIRED" : "INVALID",
          errorMessage: pData.error?.message || "Token cannot access the specified Facebook Page.",
        };
      } else {
        pageHealth.accountName = pData.name;
        pageHealth.accountId = pData.id;
      }
    } catch {
      // Ignore network errors in secondary page check
    }
  }

  const canRefreshPageFromUser = Boolean(
    pageId &&
    metaCatalogChannel.isValid &&
    (!pageHealth.isValid ||
      pageHealth.status === "EXPIRED" ||
      pageHealth.status === "EXPIRING_SOON"),
  );

  const facebookPageChannel: ChannelTokenHealth = {
    channel: "facebook_page",
    status: pageHealth.status,
    isConfigured: Boolean(pageToken && pageId),
    isValid: pageHealth.isValid,
    isPermanent: pageHealth.isPermanent,
    expiresAt: pageHealth.expiresAt ? pageHealth.expiresAt.toISOString() : null,
    expiresInDays: pageHealth.expiresInDays,
    scopes: pageHealth.scopes,
    accountName: pageHealth.accountName,
    accountId: pageHealth.accountId,
    errorMessage: pageHealth.errorMessage,
    canRefresh: canRefreshPageFromUser,
    lastCheckedAt: nowIso,
  };

  if (facebookPageChannel.isConfigured && facebookPageChannel.status === "EXPIRED") {
    actionsNeeded.push(
      canRefreshPageFromUser
        ? "Facebook Page Token expired. 1-Click Refresh is available to renew from your Meta User Token."
        : "Facebook Page Token expired. Please re-authenticate your Facebook Page.",
    );
  }

  // 3. Check Instagram Business Account Token
  const instagramAccountId = integration.instagramAccountId || "";
  let instagramChannel: ChannelTokenHealth;

  if (!instagramAccountId) {
    instagramChannel = {
      channel: "instagram",
      status: "UNCONFIGURED",
      isConfigured: false,
      isValid: false,
      isPermanent: false,
      expiresAt: null,
      expiresInDays: null,
      scopes: [],
      canRefresh: false,
      lastCheckedAt: nowIso,
    };
  } else {
    // Instagram uses the Page/User token to publish
    const igToken = integration.facebookPageAccessToken || integration.accessToken || "";
    const igHealth = await inspectMetaToken(igToken);

    instagramChannel = {
      channel: "instagram",
      status: igHealth.status,
      isConfigured: true,
      isValid: igHealth.isValid,
      isPermanent: igHealth.isPermanent,
      expiresAt: igHealth.expiresAt ? igHealth.expiresAt.toISOString() : null,
      expiresInDays: igHealth.expiresInDays,
      scopes: igHealth.scopes,
      accountId: instagramAccountId,
      errorMessage: igHealth.errorMessage,
      canRefresh: canRefreshPageFromUser,
      lastCheckedAt: nowIso,
    };

    if (instagramChannel.status === "EXPIRED") {
      actionsNeeded.push(
        "Instagram feed token has expired. Renew token to restore Instagram auto-posting.",
      );
    }
  }

  // 4. Check Pinterest Access Token
  const pinToken = integration.pinterestAccessToken || "";
  const pinHealth = await inspectPinterestToken(pinToken);

  const pinterestChannel: ChannelTokenHealth = {
    channel: "pinterest",
    status: pinHealth.status,
    isConfigured: Boolean(pinToken && !pinToken.includes("••••")),
    isValid: pinHealth.isValid,
    isPermanent: false,
    expiresAt: null,
    expiresInDays: null,
    scopes: [],
    accountName: pinHealth.username,
    errorMessage: pinHealth.errorMessage,
    canRefresh: false, // Pinterest trial/developer tokens must be generated via developer portal
    lastCheckedAt: nowIso,
  };

  if (pinterestChannel.isConfigured && pinterestChannel.status === "EXPIRED") {
    actionsNeeded.push(
      "Pinterest Access Token expired. Generate a fresh token in the Pinterest Developer App.",
    );
  }

  // Calculate Overall System Status
  const activeChannels = [
    facebookPageChannel,
    metaCatalogChannel,
    instagramChannel,
    pinterestChannel,
  ].filter((c) => c.isConfigured);

  let overallStatus: SocialTokensHealthReport["overallStatus"] = "HEALTHY";

  if (activeChannels.length === 0) {
    overallStatus = "UNCONFIGURED";
  } else if (activeChannels.some((c) => c.status === "EXPIRED" || c.status === "INVALID")) {
    overallStatus = "CRITICAL";
  } else if (activeChannels.some((c) => c.status === "EXPIRING_SOON")) {
    overallStatus = "WARNING";
  }

  return {
    overallStatus,
    checkedAt: nowIso,
    facebookPage: facebookPageChannel,
    metaCatalog: metaCatalogChannel,
    instagram: instagramChannel,
    pinterest: pinterestChannel,
    actionsNeeded,
    canAutoRefresh: canRefreshPageFromUser || metaCatalogChannel.canRefresh,
  };
}

/**
 * Performs automated refresh of social tokens for a given organization and persists updates to the database.
 */
export async function refreshAndPersistSocialTokens({
  orgId,
  dbClient = db,
}: {
  orgId: string;
  dbClient?: typeof db;
}): Promise<{
  report: SocialTokensHealthReport;
  refreshedChannels: string[];
}> {
  const [integration] = await dbClient
    .select()
    .from(schema.metaCatalogIntegrations)
    .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
    .limit(1);

  if (!integration) {
    throw new Error(`Integration for organization '${orgId}' not found.`);
  }

  const refreshedChannels: string[] = [];
  const updateValues: Partial<typeof schema.metaCatalogIntegrations.$inferInsert> = {
    updatedAt: new Date(),
  };

  let currentUserToken = integration.accessToken || "";
  let currentPageId = integration.facebookPageId || "";

  // 1. If Meta user token is expiring and app credentials are provided, exchange for fresh long-lived token
  if (currentUserToken && (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID)) {
    const userInspection = await inspectMetaToken(currentUserToken);
    if (userInspection.isValid && userInspection.status === "EXPIRING_SOON") {
      const exchangeRes = await refreshMetaUserToken(currentUserToken);
      if (exchangeRes.success && exchangeRes.accessToken) {
        currentUserToken = exchangeRes.accessToken;
        updateValues.accessToken = exchangeRes.accessToken;
        refreshedChannels.push("meta_user_token");
        logger.info("[TokenHealth] Successfully renewed Meta long-lived user token", { orgId });
      }
    }
  }

  // 2. If Facebook Page token is missing, expired, or expiring soon, re-derive from healthy User Token
  if (currentPageId && currentUserToken) {
    const pageTokenInspection = await inspectMetaToken(integration.facebookPageAccessToken || "");
    if (!pageTokenInspection.isValid || pageTokenInspection.status === "EXPIRING_SOON") {
      const pageRefreshRes = await refreshFacebookPageTokenFromUserToken({
        userToken: currentUserToken,
        pageId: currentPageId,
      });

      if (pageRefreshRes.success && pageRefreshRes.pageAccessToken) {
        updateValues.facebookPageAccessToken = pageRefreshRes.pageAccessToken;
        refreshedChannels.push("facebook_page_token");
        logger.info("[TokenHealth] Successfully renewed Facebook Page access token", {
          orgId,
          pageId: currentPageId,
        });
      }
    }
  }

  // 3. Persist any updated tokens
  if (Object.keys(updateValues).length > 1) {
    await dbClient
      .update(schema.metaCatalogIntegrations)
      .set(updateValues)
      .where(eq(schema.metaCatalogIntegrations.id, integration.id));
  }

  // 4. Re-inspect and update syncStatus / error message in DB
  const updatedIntegration = {
    ...integration,
    ...updateValues,
  };

  const report = await checkVendorSocialTokensHealth(updatedIntegration);

  let newSyncStatus = integration.syncStatus;
  let newErrorMessage: string | null = null;

  if (report.overallStatus === "CRITICAL") {
    newSyncStatus = "token_expired";
    newErrorMessage = report.actionsNeeded[0] || "One or more social tokens have expired.";
  } else if (report.overallStatus === "WARNING") {
    newSyncStatus = "token_expiring_soon";
    newErrorMessage = report.actionsNeeded[0] || "One or more social tokens are expiring soon.";
  } else if (report.overallStatus === "HEALTHY") {
    if (newSyncStatus === "token_expired" || newSyncStatus === "token_expiring_soon") {
      newSyncStatus = "connected";
      newErrorMessage = null;
    }
  }

  if (
    newSyncStatus !== integration.syncStatus ||
    newErrorMessage !== integration.lastErrorMessage
  ) {
    await dbClient
      .update(schema.metaCatalogIntegrations)
      .set({
        syncStatus: newSyncStatus,
        lastErrorMessage: newErrorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.metaCatalogIntegrations.id, integration.id));
  }

  return {
    report,
    refreshedChannels,
  };
}

/**
 * Background task helper: checks social token health across all active integrations
 * and performs automated renewals where possible.
 */
export async function checkAllVendorsSocialTokenHealth(): Promise<{
  totalChecked: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  refreshedCount: number;
}> {
  const activeIntegrations = await db
    .select({
      id: schema.metaCatalogIntegrations.id,
      orgId: schema.metaCatalogIntegrations.orgId,
    })
    .from(schema.metaCatalogIntegrations)
    .where(eq(schema.metaCatalogIntegrations.isEnabled, true));

  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let refreshedCount = 0;

  for (const item of activeIntegrations) {
    try {
      const { report, refreshedChannels } = await refreshAndPersistSocialTokens({
        orgId: item.orgId,
      });

      if (refreshedChannels.length > 0) {
        refreshedCount += refreshedChannels.length;
      }

      if (report.overallStatus === "HEALTHY") {
        healthyCount++;
      } else if (report.overallStatus === "WARNING") {
        warningCount++;
      } else if (report.overallStatus === "CRITICAL") {
        criticalCount++;
      }
    } catch (err) {
      logger.error("[TokenHealth] Failed health check for organization", {
        orgId: item.orgId,
        error: err instanceof Error ? err.message : String(err),
      });
      criticalCount++;
    }
  }

  return {
    totalChecked: activeIntegrations.length,
    healthyCount,
    warningCount,
    criticalCount,
    refreshedCount,
  };
}
