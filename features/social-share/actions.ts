"use server";

import * as schema from "@/shared/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, vendorAction, ActionError } from "@/lib/safe-action";
import { logAuditAction } from "@/shared/audit/logger";
import { logger } from "@/shared/logging/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { getOrgCurrencySettings } from "@/shared/currency/exchange-rates.service";
import {
  saveSocialSettingsSchema,
  testFacebookPagePostSchema,
  testInstagramPostSchema,
  testWebhookSchema,
  manualPublishProductSchema,
  discoverFacebookPagesSchema,
  discoverInstagramAccountSchema,
} from "./schema";
import {
  postProductToFacebookPageFeed,
  testFacebookPageConnection,
  fetchFacebookManagedPages,
} from "./services/facebook-feed";
import {
  testInstagramConnection,
  fetchLinkedInstagramAccount,
  postProductToInstagramFeed,
} from "./services/instagram-feed";
import { dispatchProductWebhook } from "./services/webhook-dispatcher";
import { dispatchProductSocialPublishing } from "./dispatcher";

/**
 * Saves or updates multi-channel social publishing settings and credentials.
 */
export const saveSocialSettingsAction = orgAdminAction
  .schema(saveSocialSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, orgId, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      // Check if existing integration row exists
      const [existing] = await db
        .select({ id: schema.metaCatalogIntegrations.id })
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      const updateValues: Partial<typeof schema.metaCatalogIntegrations.$inferInsert> = {
        brandName: parsedInput.brandName || null,
        isEnabled: parsedInput.isEnabled,
        autoPostFacebookFeed: parsedInput.autoPostFacebookFeed,
        autoPostInstagramFeed: parsedInput.autoPostInstagramFeed,
        autoSyncMetaCatalog: parsedInput.autoSyncMetaCatalog,
        autoTriggerWebhook: parsedInput.autoTriggerWebhook,
        customPostTemplate: parsedInput.customPostTemplate || null,
        webhookUrl: parsedInput.webhookUrl || null,
        updatedAt: new Date(),
      };

      if (parsedInput.catalogId !== undefined) {
        updateValues.catalogId = parsedInput.catalogId || "";
      }
      if (parsedInput.accessToken && !parsedInput.accessToken.includes("••••")) {
        updateValues.accessToken = parsedInput.accessToken;
      }
      if (parsedInput.facebookPageId !== undefined) {
        updateValues.facebookPageId = parsedInput.facebookPageId || null;
      }
      if (
        parsedInput.facebookPageAccessToken &&
        !parsedInput.facebookPageAccessToken.includes("••••")
      ) {
        updateValues.facebookPageAccessToken = parsedInput.facebookPageAccessToken;
      }
      if (parsedInput.instagramAccountId !== undefined) {
        updateValues.instagramAccountId = parsedInput.instagramAccountId || null;
      }

      if (existing) {
        await db
          .update(schema.metaCatalogIntegrations)
          .set(updateValues)
          .where(eq(schema.metaCatalogIntegrations.id, existing.id));
      } else {
        await db.insert(schema.metaCatalogIntegrations).values({
          orgId,
          catalogId: parsedInput.catalogId || "",
          accessToken: parsedInput.accessToken || "",
          facebookPageId: parsedInput.facebookPageId || null,
          facebookPageAccessToken: parsedInput.facebookPageAccessToken || null,
          instagramAccountId: parsedInput.instagramAccountId || null,
          webhookUrl: parsedInput.webhookUrl || null,
          brandName: parsedInput.brandName || null,
          isEnabled: parsedInput.isEnabled,
          autoPostFacebookFeed: parsedInput.autoPostFacebookFeed,
          autoPostInstagramFeed: parsedInput.autoPostInstagramFeed,
          autoSyncMetaCatalog: parsedInput.autoSyncMetaCatalog,
          autoTriggerWebhook: parsedInput.autoTriggerWebhook,
          customPostTemplate: parsedInput.customPostTemplate || null,
        });
      }

      await logAuditAction({
        userId,
        action: "UPDATE_SOCIAL_PUBLISHING_SETTINGS",
        targetType: "vendor",
        targetId: orgId,
        metadata: {
          orgId,
          facebookPageId: parsedInput.facebookPageId,
          autoPostFacebookFeed: parsedInput.autoPostFacebookFeed,
          autoPostInstagramFeed: parsedInput.autoPostInstagramFeed,
        },
      });

      revalidatePath("/vendor/settings/social");
      revalidatePath("/vendor/settings/facebook-shop");
      return { success: true };
    });
  });

/**
 * Tests Facebook Page connection.
 */
export const testFacebookPageConnectionAction = orgAdminAction
  .schema(testFacebookPagePostSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      let pageId = parsedInput.facebookPageId?.trim();
      let pageAccessToken = parsedInput.facebookPageAccessToken?.trim();

      if (!pageId || !pageAccessToken || pageAccessToken.includes("••••")) {
        const [integration] = await db
          .select()
          .from(schema.metaCatalogIntegrations)
          .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
          .limit(1);

        if (integration) {
          pageId = pageId || integration.facebookPageId || "";
          if (!pageAccessToken || pageAccessToken.includes("••••")) {
            pageAccessToken = integration.facebookPageAccessToken || integration.accessToken || "";
          }
        }
      }

      if (!pageId || !pageAccessToken) {
        throw new ActionError("Facebook Page ID and Access Token are required.");
      }

      const result = await testFacebookPageConnection({
        pageId,
        pageAccessToken,
      });

      if (!result.valid) {
        throw new ActionError(result.error || "Failed to verify Facebook Page connection.");
      }

      return {
        success: true,
        pageName: result.pageName,
      };
    });
  });

/**
 * Tests Instagram Business account connection.
 */
export const testInstagramConnectionAction = orgAdminAction
  .schema(testInstagramPostSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      let igAccountId = parsedInput.instagramAccountId?.trim();
      let accessToken = parsedInput.accessToken?.trim();

      if (!igAccountId || !accessToken || accessToken.includes("••••")) {
        const [integration] = await db
          .select()
          .from(schema.metaCatalogIntegrations)
          .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
          .limit(1);

        if (integration) {
          igAccountId = igAccountId || integration.instagramAccountId || "";
          if (!accessToken || accessToken.includes("••••")) {
            accessToken = integration.facebookPageAccessToken || integration.accessToken || "";
          }
        }
      }

      if (!igAccountId || !accessToken) {
        throw new ActionError("Instagram Account ID and Access Token are required.");
      }

      const result = await testInstagramConnection({
        igAccountId,
        accessToken,
      });

      if (!result.valid) {
        throw new ActionError(result.error || "Failed to verify Instagram connection.");
      }

      return {
        success: true,
        username: result.username,
      };
    });
  });

/**
 * Tests outbound webhook endpoint.
 */
export const testWebhookAction = orgAdminAction
  .schema(testWebhookSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      const result = await dispatchProductWebhook({
        webhookUrl: parsedInput.webhookUrl,
        event: "ping",
        orgId: ctx.orgId || "test-org",
      });

      if (!result.success) {
        throw new ActionError(result.error || "Webhook test request failed.");
      }

      return { success: true };
    });
  });

/**
 * Discovers and lists all Facebook Pages accessible with the given token.
 */
export const discoverFacebookPagesAction = orgAdminAction
  .schema(discoverFacebookPagesSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(15, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      let tokenToUse = parsedInput.accessToken?.trim();
      let pageIdHint = parsedInput.pageIdHint?.trim();

      if (!tokenToUse || tokenToUse.includes("••••")) {
        const [integration] = await db
          .select()
          .from(schema.metaCatalogIntegrations)
          .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
          .limit(1);

        if (integration) {
          tokenToUse = integration.facebookPageAccessToken || integration.accessToken || "";
          pageIdHint = pageIdHint || integration.facebookPageId || undefined;
        }
      }

      if (!tokenToUse) {
        throw new ActionError("Please paste or save a Meta Access Token first.");
      }

      const result = await fetchFacebookManagedPages({
        accessToken: tokenToUse,
        pageIdHint,
      });

      if (!result.success) {
        throw new ActionError(result.error || "Failed to discover Facebook Pages.");
      }

      return {
        success: true,
        pages: result.pages,
      };
    });
  });

/**
 * Automatically discovers the linked Instagram Business Account for the Facebook Page.
 */
export const discoverInstagramAccountAction = orgAdminAction
  .schema(discoverInstagramAccountSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(15, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      let pageId = parsedInput.facebookPageId?.trim();
      let tokenToUse = parsedInput.accessToken?.trim();
      let businessManagerId = parsedInput.businessManagerId?.trim();
      let igAccountIdHint = parsedInput.igAccountIdHint?.trim();

      const [integration] = await db
        .select()
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      if (integration) {
        pageId = pageId || integration.facebookPageId || "";
        businessManagerId = businessManagerId || integration.businessManagerId || "208458023692445";
        igAccountIdHint = igAccountIdHint || integration.instagramAccountId || "17841406751842985";
        if (!tokenToUse || tokenToUse.includes("••••")) {
          tokenToUse = integration.facebookPageAccessToken || integration.accessToken || "";
        }
      }

      if (!tokenToUse) {
        throw new ActionError(
          "Meta Access Token is required. Please paste or save your token first.",
        );
      }

      const result = await fetchLinkedInstagramAccount({
        facebookPageId: pageId,
        accessToken: tokenToUse,
        businessManagerId,
        igAccountIdHint,
      });

      if (!result.success || !result.account) {
        throw new ActionError(result.error || "Failed to discover linked Instagram account.");
      }

      return {
        success: true,
        account: result.account,
      };
    });
  });

/**
 * Manually triggers publishing a single product to selected channels.
 */
export const manualPublishProductAction = vendorAction
  .schema(manualPublishProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgId, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(15, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      const [integration] = await db
        .select()
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      if (parsedInput.channels.includes("facebook_feed")) {
        if (!integration?.facebookPageId) {
          throw new ActionError(
            "Facebook Page ID is not configured. Please save your Page ID in Settings -> Social first.",
          );
        }
        if (!integration.facebookPageAccessToken && !integration.accessToken) {
          throw new ActionError(
            "Facebook Page Access Token is missing. Please save your token in Settings -> Social first.",
          );
        }
      }

      const results = await dispatchProductSocialPublishing({
        orgId,
        productId: parsedInput.productId,
        action: "CREATE",
      });

      if (parsedInput.channels.includes("facebook_feed") && results.facebookFeed) {
        if (!results.facebookFeed.success) {
          throw new ActionError(
            results.facebookFeed.error || "Failed to publish post to your Facebook Page timeline.",
          );
        }
      }

      revalidatePath("/vendor");
      return {
        success: true,
        results,
      };
    });
  });

/**
 * Bulk publishes all active store products to the Facebook Page Feed.
 */
export const triggerBatchFacebookFeedPostAction = vendorAction.action(async ({ ctx }) => {
  const { orgId, db } = ctx;

  return runWithCorrelationId(async () => {
    await rateLimit(5, 60 * 1000);

    if (!orgId) {
      throw new ActionError("Not authorized: You must be signed in with an active organization.");
    }

    const [integration] = await db
      .select()
      .from(schema.metaCatalogIntegrations)
      .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
      .limit(1);

    if (!integration?.facebookPageId) {
      throw new ActionError(
        "Facebook Page ID is not configured. Please enter your numeric Page ID.",
      );
    }

    const fbToken = integration.facebookPageAccessToken || integration.accessToken;
    if (!fbToken) {
      throw new ActionError("Facebook Access Token is missing. Please save your Page Token first.");
    }

    // Fetch all active products
    const activeProducts = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")));

    const orgCurrency = await getOrgCurrencySettings(orgId);
    const currency = orgCurrency.baseCurrency || "LKR";
    const brandName = integration.brandName || "Dilnova Store";

    let totalSuccess = 0;
    let totalFailed = 0;
    let skippedCount = 0;

    for (const prod of activeProducts) {
      const hasMedia = Boolean(
        prod.imageUrl?.trim() ||
        (Array.isArray(prod.media) &&
          prod.media.some((m) => m && (typeof m === "string" ? Boolean(m) : Boolean(m.url)))),
      );
      if (!hasMedia) {
        skippedCount++;
        await db.insert(schema.metaCatalogSyncLogs).values({
          orgId,
          productId: prod.id,
          action: "FACEBOOK_FEED_POST",
          status: "SKIPPED",
          productName: prod.name,
          productSku: prod.sku,
          errorMessage: "Skipped: No photo or media uploaded",
        });
        continue;
      }

      try {
        const res = await postProductToFacebookPageFeed({
          pageId: integration.facebookPageId,
          pageAccessToken: fbToken,
          product: prod,
          currency,
          brandName,
          customTemplate: integration.customPostTemplate,
        });

        if (res.success) {
          totalSuccess++;
          await db.insert(schema.metaCatalogSyncLogs).values({
            orgId,
            productId: prod.id,
            action: "FACEBOOK_FEED_POST",
            status: "SUCCESS",
            productName: prod.name,
            productSku: prod.sku,
            errorMessage: null,
          });
        } else {
          totalFailed++;
          await db.insert(schema.metaCatalogSyncLogs).values({
            orgId,
            productId: prod.id,
            action: "FACEBOOK_FEED_POST",
            status: "FAILED",
            productName: prod.name,
            productSku: prod.sku,
            errorMessage: res.error || "Failed to publish photo post",
          });
        }

        // Small delay between posts to prevent Facebook spam throttling
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        totalFailed++;
        logger.error("Error bulk posting product to Facebook Feed", { prodId: prod.id, err });
      }
    }

    revalidatePath("/vendor");
    revalidatePath("/vendor/settings/facebook-shop");

    return {
      totalSuccess,
      totalFailed,
      skippedCount,
      totalCount: activeProducts.length,
      message: `Bulk Facebook Feed publishing finished: ${totalSuccess} published, ${skippedCount} skipped (no media), ${totalFailed} failed.`,
    };
  });
});

/**
 * Bulk publishes all active store products with images to the linked Instagram Feed.
 */
export const triggerBatchInstagramFeedPostAction = vendorAction.action(async ({ ctx }) => {
  const { orgId, db } = ctx;

  return runWithCorrelationId(async () => {
    await rateLimit(5, 60 * 1000);

    if (!orgId) {
      throw new ActionError("Not authorized: You must be signed in with an active organization.");
    }

    const [integration] = await db
      .select()
      .from(schema.metaCatalogIntegrations)
      .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
      .limit(1);

    if (!integration?.instagramAccountId) {
      throw new ActionError(
        "Instagram Account ID is not configured. Please enter or auto-detect your Instagram Account ID first.",
      );
    }

    const igToken = integration.facebookPageAccessToken || integration.accessToken;
    if (!igToken) {
      throw new ActionError("Meta Access Token is missing. Please save your Access Token first.");
    }

    // Fetch all active products
    const activeProducts = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")));

    const orgCurrency = await getOrgCurrencySettings(orgId);
    const currency = orgCurrency.baseCurrency || "LKR";
    const brandName = integration.brandName || "Dilnova Store";

    let totalSuccess = 0;
    let totalFailed = 0;
    let skippedCount = 0;

    for (const prod of activeProducts) {
      const hasMedia = Boolean(
        prod.imageUrl?.trim() ||
        (Array.isArray(prod.media) &&
          prod.media.some((m) => m && (typeof m === "string" ? Boolean(m) : Boolean(m.url)))),
      );
      if (!hasMedia) {
        skippedCount++;
        await db.insert(schema.metaCatalogSyncLogs).values({
          orgId,
          productId: prod.id,
          action: "INSTAGRAM_FEED_POST",
          status: "SKIPPED",
          productName: prod.name,
          productSku: prod.sku,
          errorMessage: "Skipped: No photo or media uploaded",
        });
        continue;
      }

      try {
        const res = await postProductToInstagramFeed({
          igAccountId: integration.instagramAccountId,
          accessToken: igToken,
          product: prod,
          currency,
          brandName,
        });

        if (res.success) {
          totalSuccess++;
          await db.insert(schema.metaCatalogSyncLogs).values({
            orgId,
            productId: prod.id,
            action: "INSTAGRAM_FEED_POST",
            status: "SUCCESS",
            productName: prod.name,
            productSku: prod.sku,
            errorMessage: null,
          });
        } else {
          totalFailed++;
          await db.insert(schema.metaCatalogSyncLogs).values({
            orgId,
            productId: prod.id,
            action: "INSTAGRAM_FEED_POST",
            status: "FAILED",
            productName: prod.name,
            productSku: prod.sku,
            errorMessage: res.error || "Failed to publish photo to Instagram",
          });
        }

        // Small delay between posts to respect Instagram rate limits
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        totalFailed++;
        logger.error("Error bulk posting product to Instagram Feed", { prodId: prod.id, err });
      }
    }

    revalidatePath("/vendor");
    revalidatePath("/vendor/settings/facebook-shop");

    return {
      totalSuccess,
      totalFailed,
      skippedCount,
      totalCount: activeProducts.length,
      message: `Bulk Instagram Feed publishing finished: ${totalSuccess} published, ${skippedCount} skipped (no media), ${totalFailed} failed.`,
    };
  });
});

/**
 * Fetches all social publishing settings with token masking.
 */
export const getSocialSettingsAction = vendorAction.action(async ({ ctx }) => {
  const { orgId, db } = ctx;

  if (!orgId) {
    throw new ActionError("Not authorized: You must be signed in with an active organization.");
  }

  const [integration] = await db
    .select()
    .from(schema.metaCatalogIntegrations)
    .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
    .limit(1);

  if (!integration) {
    return { integration: null };
  }

  return {
    integration: {
      ...integration,
      hasAccessToken: Boolean(integration.accessToken),
      hasPageAccessToken: Boolean(integration.facebookPageAccessToken),
      accessToken: integration.accessToken ? "••••••••••••••••" : "",
      facebookPageAccessToken: integration.facebookPageAccessToken ? "••••••••••••••••" : "",
    },
  };
});
