"use server";

import * as schema from "@/shared/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, vendorAction, ActionError } from "@/lib/safe-action";
import { logger } from "@/shared/logging/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { getOrgCurrencySettings } from "@/shared/currency/exchange-rates.service";
import {
  testFacebookPagePostSchema,
  discoverFacebookPagesSchema,
  triggerBatchPostSchema,
} from "../schema";
import {
  postProductToFacebookPageFeed,
  testFacebookPageConnection,
  fetchFacebookManagedPages,
} from "../services/facebook-feed";

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
 * Bulk publishes all active store products to the Facebook Page Feed.
 */
export const triggerBatchFacebookFeedPostAction = vendorAction
  .schema(triggerBatchPostSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { orgId, db } = ctx;
    const forceRepost = parsedInput?.forceRepost ?? false;

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
        throw new ActionError(
          "Facebook Access Token is missing. Please save your Page Token first.",
        );
      }

      // Fetch all active products
      const activeProducts = await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")));

      // Query live Facebook Page feed to detect what is actually published on the timeline right now
      const alreadyPostedProductIds = new Set<string>();
      if (!forceRepost) {
        let pageTokenToUse = fbToken;
        try {
          const pageTokenRes = await fetch(
            `https://graph.facebook.com/v21.0/${integration.facebookPageId}?fields=access_token&access_token=${encodeURIComponent(fbToken)}`,
          );
          if (pageTokenRes.ok) {
            const pageTokenData = await pageTokenRes.json();
            if (pageTokenData.access_token) {
              pageTokenToUse = pageTokenData.access_token;
            }
          }
        } catch {}

        try {
          const liveRes = await fetch(
            `https://graph.facebook.com/v21.0/${integration.facebookPageId}/published_posts?fields=id,message&limit=100&access_token=${encodeURIComponent(pageTokenToUse)}`,
          );
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            if (Array.isArray(liveData.data)) {
              for (const item of liveData.data) {
                const message = item.message || "";
                for (const prod of activeProducts) {
                  if (message.includes(prod.id)) {
                    alreadyPostedProductIds.add(prod.id);
                  }
                }
              }
            }
          } else {
            throw new Error(`Facebook API responded with HTTP ${liveRes.status}`);
          }
        } catch (err) {
          logger.warn("Could not query live Facebook feed, falling back to sync logs", { err });
          const existingSuccessPosts = await db
            .select({ productId: schema.metaCatalogSyncLogs.productId })
            .from(schema.metaCatalogSyncLogs)
            .where(
              and(
                eq(schema.metaCatalogSyncLogs.orgId, orgId),
                eq(schema.metaCatalogSyncLogs.action, "FACEBOOK_FEED_POST"),
                eq(schema.metaCatalogSyncLogs.status, "SUCCESS"),
              ),
            );
          for (const p of existingSuccessPosts) {
            if (p.productId) alreadyPostedProductIds.add(p.productId);
          }
        }
      }

      const orgCurrency = await getOrgCurrencySettings(orgId);
      const currency = orgCurrency.baseCurrency || "LKR";
      const brandName = integration.brandName || "Dilnova Store";

      let totalSuccess = 0;
      let totalFailed = 0;
      let skippedCount = 0;
      let alreadySyncedCount = 0;

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

        // Prevent duplicate posts on timeline unless explicitly forced
        if (!forceRepost && alreadyPostedProductIds.has(prod.id)) {
          alreadySyncedCount++;
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
            alreadyPostedProductIds.add(prod.id);
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
        alreadySyncedCount,
        totalCount: activeProducts.length,
        message: `Facebook Feed Sync: ${totalSuccess} new published, ${alreadySyncedCount} already on Feed (duplicates skipped), ${skippedCount} skipped (no media), ${totalFailed} failed.`,
      };
    });
  });
