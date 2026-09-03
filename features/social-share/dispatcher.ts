import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";
import { getOrgCurrencySettings } from "@/shared/currency/exchange-rates.service";
import { postProductToFacebookPageFeed } from "./services/facebook-feed";
import { postProductToInstagramFeed } from "./services/instagram-feed";
import { dispatchProductWebhook } from "./services/webhook-dispatcher";
import {
  formatDilnovaProductForMeta,
  sendMetaItemsBatch,
} from "@/features/facebook-shop/services/meta-api";
import { MultiChannelPublishResult, SocialProductPayload } from "./types";
import { MetaBatchPayload } from "@/features/facebook-shop/types";

interface DispatchParams {
  orgId: string;
  productId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  productNameHint?: string;
}

/**
 * Central multi-channel dispatcher that publishes product lifecycle events
 * across Facebook Feed, Instagram Feed, Meta Commerce Catalog, and Webhooks concurrently.
 */
export async function dispatchProductSocialPublishing({
  orgId,
  productId,
  action,
  productNameHint,
}: DispatchParams): Promise<MultiChannelPublishResult> {
  const results: MultiChannelPublishResult = {};

  try {
    // 1. Fetch organization social integration credentials
    const [integration] = await db
      .select()
      .from(schema.metaCatalogIntegrations)
      .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
      .limit(1);

    if (!integration || !integration.isEnabled) {
      return results;
    }

    // Check specific action sync toggle
    if (action === "CREATE" && !integration.autoSyncOnCreate) {
      return results;
    }
    if (action === "UPDATE" && !integration.autoSyncOnUpdate) {
      return results;
    }
    if (action === "DELETE" && !integration.autoSyncOnDelete) {
      return results;
    }

    // 2. Fetch product details
    let prod: SocialProductPayload | null = null;
    let productName = productNameHint || "Product";
    let productSku: string | null = null;
    let inventoryQty = 1;

    if (action !== "DELETE") {
      const [dbProd] = await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.id, productId), eq(schema.products.orgId, orgId)))
        .limit(1);

      if (!dbProd) {
        logger.warn("Social publishing skipped: Product not found", { orgId, productId });
        return results;
      }

      prod = dbProd;
      productName = dbProd.name;
      productSku = dbProd.sku;

      const [inv] = await db
        .select({ quantity: schema.inventory.quantity })
        .from(schema.inventory)
        .where(eq(schema.inventory.productId, productId))
        .limit(1);

      inventoryQty = inv?.quantity ?? (dbProd.type === "product" ? 0 : 1);
    }

    const orgCurrency = await getOrgCurrencySettings(orgId);
    const currency = orgCurrency.baseCurrency || "LKR";
    const brandName = integration.brandName || "Dilnova Store";
    const fbToken = integration.facebookPageAccessToken || integration.accessToken;

    const hasMedia = Boolean(
      prod?.imageUrl?.trim() ||
      (Array.isArray(prod?.media) &&
        prod?.media.some((m) => m && (typeof m === "string" ? Boolean(m) : Boolean(m.url)))),
    );

    // ── CHANNEL 1: Facebook Page Feed Auto-Posting ───────────────────────────
    if (integration.autoPostFacebookFeed && integration.facebookPageId && fbToken) {
      if (action === "DELETE") {
        // Automatically delete post from Facebook Page when product is deleted in Dilnova
        try {
          let pageTokenToUse = fbToken;
          const pageTokenRes = await fetch(
            `https://graph.facebook.com/v21.0/${integration.facebookPageId}?fields=access_token&access_token=${encodeURIComponent(fbToken)}`,
          );
          if (pageTokenRes.ok) {
            const pageTokenData = await pageTokenRes.json();
            if (pageTokenData.access_token) {
              pageTokenToUse = pageTokenData.access_token;
            }
          }

          const postsRes = await fetch(
            `https://graph.facebook.com/v21.0/${integration.facebookPageId}/published_posts?fields=id,message&limit=50&access_token=${encodeURIComponent(pageTokenToUse)}`,
          );
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            for (const post of postsData.data || []) {
              if (post.message && post.message.includes(productId)) {
                await fetch(
                  `https://graph.facebook.com/v21.0/${post.id}?access_token=${encodeURIComponent(pageTokenToUse)}`,
                  { method: "DELETE" },
                );
              }
            }
          }
        } catch (err) {
          logger.warn("Could not delete Facebook page post on product delete", { productId, err });
        }
      } else if (action === "CREATE" && prod && hasMedia) {
        // Prevent duplicate posts on Facebook Page Feed
        const [existingLog] = await db
          .select({ id: schema.metaCatalogSyncLogs.id })
          .from(schema.metaCatalogSyncLogs)
          .where(
            and(
              eq(schema.metaCatalogSyncLogs.orgId, orgId),
              eq(schema.metaCatalogSyncLogs.productId, productId),
              eq(schema.metaCatalogSyncLogs.action, "FACEBOOK_FEED_POST"),
              eq(schema.metaCatalogSyncLogs.status, "SUCCESS"),
            ),
          )
          .limit(1);

        if (!existingLog) {
          try {
            const fbResult = await postProductToFacebookPageFeed({
              pageId: integration.facebookPageId,
              pageAccessToken: fbToken,
              product: prod,
              currency,
              brandName,
              customTemplate: integration.customPostTemplate,
            });

            results.facebookFeed = fbResult;

            await db.insert(schema.metaCatalogSyncLogs).values({
              orgId,
              productId,
              action: "FACEBOOK_FEED_POST",
              status: fbResult.success ? "SUCCESS" : "FAILED",
              productName,
              productSku,
              errorMessage: fbResult.error || null,
            });
          } catch (err) {
            logger.error("Facebook feed auto-post failed", { orgId, productId, err });
            results.facebookFeed = {
              success: false,
              error: err instanceof Error ? err.message : "Failed to post to Facebook Feed",
            };
          }
        }
      }
    }

    // ── CHANNEL 2: Instagram Feed Auto-Posting ────────────────────────────────
    if (
      integration.autoPostInstagramFeed &&
      integration.instagramAccountId &&
      fbToken &&
      action === "CREATE" &&
      hasMedia &&
      prod
    ) {
      // Prevent duplicate posts on Instagram Feed
      const [existingLog] = await db
        .select({ id: schema.metaCatalogSyncLogs.id })
        .from(schema.metaCatalogSyncLogs)
        .where(
          and(
            eq(schema.metaCatalogSyncLogs.orgId, orgId),
            eq(schema.metaCatalogSyncLogs.productId, productId),
            eq(schema.metaCatalogSyncLogs.action, "INSTAGRAM_FEED_POST"),
            eq(schema.metaCatalogSyncLogs.status, "SUCCESS"),
          ),
        )
        .limit(1);

      if (!existingLog) {
        try {
          const igResult = await postProductToInstagramFeed({
            igAccountId: integration.instagramAccountId,
            accessToken: fbToken,
            product: prod,
            currency,
            brandName,
          });

          results.instagramFeed = igResult;

          await db.insert(schema.metaCatalogSyncLogs).values({
            orgId,
            productId,
            action: "INSTAGRAM_FEED_POST",
            status: igResult.success ? "SUCCESS" : "FAILED",
            productName,
            productSku,
            errorMessage: igResult.error || null,
          });
        } catch (err) {
          logger.error("Instagram feed auto-post failed", { orgId, productId, err });
        }
      }
    }

    // ── CHANNEL 3: Meta Commerce Catalog Sync ────────────────────────────────
    if (integration.autoSyncMetaCatalog && integration.catalogId && integration.accessToken) {
      try {
        let payload: MetaBatchPayload;

        if (action === "DELETE") {
          payload = {
            item_type: "PRODUCT_ITEM",
            requests: [{ method: "DELETE", retailer_id: productId }],
          };
        } else if (prod) {
          const formatted = formatDilnovaProductForMeta({
            product: prod,
            quantity: inventoryQty,
            currency,
            brandName,
          });

          // UPDATE in Meta items_batch acts as an upsert (creates if not existing, updates if existing)
          payload = {
            item_type: "PRODUCT_ITEM",
            requests: [{ method: "UPDATE", data: formatted }],
          };
        } else {
          payload = { item_type: "PRODUCT_ITEM", requests: [] };
        }

        if (payload.requests.length > 0) {
          const catRes = await sendMetaItemsBatch({
            catalogId: integration.catalogId,
            accessToken: integration.accessToken,
            payload,
          });

          const isSuccess = !catRes.error;
          results.metaCatalog = { success: isSuccess, error: catRes.error?.message };

          await db.insert(schema.metaCatalogSyncLogs).values({
            orgId,
            productId: action === "DELETE" ? null : productId,
            action,
            status: isSuccess ? "SUCCESS" : "FAILED",
            productName,
            productSku,
            metaBatchHandle: catRes.handles?.[0] || null,
            metaResponse: catRes as unknown as Record<string, unknown>,
            errorMessage: catRes.error?.message || null,
          });
        }
      } catch (err) {
        logger.error("Meta catalog sync failed in multi-channel dispatcher", {
          orgId,
          productId,
          err,
        });
      }
    }

    // ── CHANNEL 4: Outbound Webhook / WhatsApp Automation ─────────────────────
    if (integration.autoTriggerWebhook && integration.webhookUrl) {
      try {
        const webhookEvent =
          action === "CREATE"
            ? "product.created"
            : action === "UPDATE"
              ? "product.updated"
              : "product.deleted";

        const whResult = await dispatchProductWebhook({
          webhookUrl: integration.webhookUrl,
          event: webhookEvent,
          orgId,
          product: action === "DELETE" ? { id: productId } : prod || undefined,
        });

        results.webhook = whResult;
      } catch (err) {
        logger.warn("Webhook dispatch failed in multi-channel dispatcher", {
          orgId,
          productId,
          err,
        });
      }
    }

    // 3. Update lastSyncAt timestamp
    await db
      .update(schema.metaCatalogIntegrations)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.metaCatalogIntegrations.id, integration.id));

    return results;
  } catch (error) {
    logger.error("Unhandled error in dispatchProductSocialPublishing", {
      orgId,
      productId,
      action,
      error,
    });
    return results;
  }
}
