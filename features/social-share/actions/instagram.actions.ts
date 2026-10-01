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
  testInstagramPostSchema,
  discoverInstagramAccountSchema,
  triggerBatchPostSchema,
} from "../schema";
import {
  testInstagramConnection,
  fetchLinkedInstagramAccount,
  postProductToInstagramFeed,
} from "../services/instagram-feed";

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

      let pageIdToUse = parsedInput.facebookPageId?.trim();
      let tokenToUse = parsedInput.accessToken?.trim();

      if (!pageIdToUse || !tokenToUse || tokenToUse.includes("••••")) {
        const [integration] = await db
          .select()
          .from(schema.metaCatalogIntegrations)
          .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
          .limit(1);

        if (integration) {
          pageIdToUse = pageIdToUse || integration.facebookPageId || "";
          tokenToUse = integration.facebookPageAccessToken || integration.accessToken || "";
        }
      }

      if (!pageIdToUse) {
        throw new ActionError("Please configure a Facebook Page ID first.");
      }
      if (!tokenToUse) {
        throw new ActionError("Please paste or save a Meta Access Token first.");
      }

      const result = await fetchLinkedInstagramAccount({
        facebookPageId: pageIdToUse,
        accessToken: tokenToUse,
        businessManagerId: parsedInput.businessManagerId?.trim(),
        igAccountIdHint: parsedInput.igAccountIdHint?.trim(),
      });

      if (!result.success || !result.account) {
        throw new ActionError(
          result.error ||
            "No linked Instagram Business Account found for this Facebook Page. Ensure an Instagram professional account is connected in your Meta Business Suite.",
        );
      }

      return {
        success: true,
        account: result.account,
        instagramAccountId: result.account.id,
        username: result.account.username,
        name: result.account.name,
      };
    });
  });

/**
 * Bulk publishes all active store products with images to the linked Instagram Feed.
 */
export const triggerBatchInstagramFeedPostAction = vendorAction
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

      // Query live Instagram feed to detect what is actually published on the profile right now
      const alreadyPostedProductIds = new Set<string>();
      if (!forceRepost) {
        try {
          const liveRes = await fetch(
            `https://graph.facebook.com/v21.0/${integration.instagramAccountId}/media?fields=id,caption&limit=100&access_token=${encodeURIComponent(igToken)}`,
          );
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            if (Array.isArray(liveData.data)) {
              for (const item of liveData.data) {
                const caption = item.caption || "";
                for (const prod of activeProducts) {
                  if (caption.includes(prod.id)) {
                    alreadyPostedProductIds.add(prod.id);
                  }
                }
              }
            }
          } else {
            throw new Error(`Instagram API responded with HTTP ${liveRes.status}`);
          }
        } catch (err) {
          logger.warn("Could not query live Instagram media, falling back to sync logs", { err });
          const existingSuccessPosts = await db
            .select({ productId: schema.metaCatalogSyncLogs.productId })
            .from(schema.metaCatalogSyncLogs)
            .where(
              and(
                eq(schema.metaCatalogSyncLogs.orgId, orgId),
                eq(schema.metaCatalogSyncLogs.action, "INSTAGRAM_FEED_POST"),
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
            action: "INSTAGRAM_FEED_POST",
            status: "SKIPPED",
            productName: prod.name,
            productSku: prod.sku,
            errorMessage: "Skipped: No photo or media uploaded",
          });
          continue;
        }

        // Prevent duplicate posts on Instagram grid unless explicitly forced
        if (!forceRepost && alreadyPostedProductIds.has(prod.id)) {
          alreadySyncedCount++;
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
            alreadyPostedProductIds.add(prod.id);
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
        alreadySyncedCount,
        totalCount: activeProducts.length,
        message: `Instagram Sync: ${totalSuccess} new published, ${alreadySyncedCount} already on Instagram (duplicates skipped), ${skippedCount} skipped (no media), ${totalFailed} failed.`,
      };
    });
  });
