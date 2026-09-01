"use server";

import * as schema from "@/shared/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, vendorAction, ActionError } from "@/lib/safe-action";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { getOrgCurrencySettings } from "@/shared/currency/exchange-rates.service";
import {
  saveFacebookShopSettingsSchema,
  testFacebookShopConnectionSchema,
  triggerBatchSyncSchema,
  getFacebookSyncLogsSchema,
} from "./schema";
import {
  testCatalogConnection,
  formatDilnovaProductForMeta,
  chunkArray,
  sendMetaItemsBatch,
} from "./services/meta-api";
import { MetaBatchPayload } from "./types";

/**
 * Saves or updates Meta Catalog credentials and auto-sync preferences for the active organization.
 */
export const saveFacebookShopSettingsAction = orgAdminAction
  .schema(saveFacebookShopSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, orgId, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      // 1. Verify credentials with Meta before saving
      const testResult = await testCatalogConnection({
        catalogId: parsedInput.catalogId,
        accessToken: parsedInput.accessToken,
      });

      if (!testResult.valid) {
        throw new ActionError(
          `Meta Catalog verification failed: ${testResult.error || "Invalid Catalog ID or Access Token"}. Please verify your credentials in Meta Commerce Manager.`,
        );
      }

      // 2. Upsert settings in database
      const [existing] = await db
        .select({ id: schema.metaCatalogIntegrations.id })
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      if (existing) {
        await db
          .update(schema.metaCatalogIntegrations)
          .set({
            catalogId: parsedInput.catalogId,
            accessToken: parsedInput.accessToken,
            brandName: parsedInput.brandName || null,
            facebookPageId: parsedInput.facebookPageId || null,
            businessManagerId: parsedInput.businessManagerId || null,
            isEnabled: parsedInput.isEnabled,
            autoSyncOnCreate: parsedInput.autoSyncOnCreate,
            autoSyncOnUpdate: parsedInput.autoSyncOnUpdate,
            autoSyncOnDelete: parsedInput.autoSyncOnDelete,
            syncStatus: "connected",
            lastErrorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.metaCatalogIntegrations.id, existing.id));
      } else {
        await db.insert(schema.metaCatalogIntegrations).values({
          orgId,
          catalogId: parsedInput.catalogId,
          accessToken: parsedInput.accessToken,
          brandName: parsedInput.brandName || null,
          facebookPageId: parsedInput.facebookPageId || null,
          businessManagerId: parsedInput.businessManagerId || null,
          isEnabled: parsedInput.isEnabled,
          autoSyncOnCreate: parsedInput.autoSyncOnCreate,
          autoSyncOnUpdate: parsedInput.autoSyncOnUpdate,
          autoSyncOnDelete: parsedInput.autoSyncOnDelete,
          syncStatus: "connected",
        });
      }

      await logAuditAction({
        userId,
        action: "UPDATE_FACEBOOK_SHOP_SETTINGS",
        targetType: "vendor",
        targetId: parsedInput.catalogId,
        metadata: {
          orgId,
          catalogId: parsedInput.catalogId,
          isEnabled: parsedInput.isEnabled,
          catalogName: testResult.catalogName,
        },
      });

      revalidatePath("/vendor/settings/facebook-shop");
      return {
        success: true,
        catalogName: testResult.catalogName,
      };
    });
  });

/**
 * Tests connection to Meta Catalog API without saving to DB.
 */
export const testFacebookShopConnectionAction = orgAdminAction
  .schema(testFacebookShopConnectionSchema)
  .action(async ({ parsedInput }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      const result = await testCatalogConnection({
        catalogId: parsedInput.catalogId,
        accessToken: parsedInput.accessToken,
      });

      if (!result.valid) {
        throw new ActionError(result.error || "Failed to verify Meta Catalog credentials.");
      }

      return {
        success: true,
        catalogName: result.catalogName,
        businessId: result.businessId,
      };
    });
  });

/**
 * Bulk-syncs all active products for the organization to the Meta Commerce Catalog.
 */
export const triggerBatchFacebookShopSyncAction = orgAdminAction
  .schema(triggerBatchSyncSchema)
  .action(async ({ ctx }) => {
    const { userId, orgId, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(5, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      // 1. Fetch integration
      const [integration] = await db
        .select()
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      if (!integration || !integration.isEnabled) {
        throw new ActionError(
          "Facebook Shop integration is not configured or is currently disabled.",
        );
      }

      // 2. Fetch all active products for this org
      const activeProducts = await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")));

      if (activeProducts.length === 0) {
        return {
          success: true,
          totalProducts: 0,
          message: "No active products found to sync.",
        };
      }

      // 3. Fetch inventory for all products
      const inventoryList = await db
        .select({
          productId: schema.inventory.productId,
          quantity: schema.inventory.quantity,
        })
        .from(schema.inventory);

      const inventoryMap = new Map<string, number>();
      for (const inv of inventoryList) {
        if (inv.productId) {
          inventoryMap.set(inv.productId, inv.quantity);
        }
      }

      const orgCurrency = await getOrgCurrencySettings(orgId);

      // 4. Format all products into Meta specification
      const formattedItems = activeProducts.map((prod) => {
        const qty = inventoryMap.get(prod.id) ?? (prod.type === "product" ? 0 : 1);
        return formatDilnovaProductForMeta({
          product: prod,
          quantity: qty,
          currency: orgCurrency.baseCurrency || "LKR",
          brandName: integration.brandName,
        });
      });

      // 5. Chunk items into <= 3000 batches
      const chunks = chunkArray(formattedItems, 3000);
      let totalSuccess = 0;
      let totalFailed = 0;
      const handles: string[] = [];

      for (const chunk of chunks) {
        const payload: MetaBatchPayload = {
          item_type: "PRODUCT_ITEM",
          requests: chunk.map((item) => ({
            method: "UPDATE",
            data: item,
          })),
        };

        const batchRes = await sendMetaItemsBatch({
          catalogId: integration.catalogId,
          accessToken: integration.accessToken,
          payload,
        });

        if (batchRes.error) {
          totalFailed += chunk.length;
        } else {
          totalSuccess += chunk.length;
          if (batchRes.handles) {
            handles.push(...batchRes.handles);
          }
        }
      }

      // 6. Log batch sync
      await db.insert(schema.metaCatalogSyncLogs).values({
        orgId,
        productId: null,
        action: "BATCH_SYNC",
        status: totalFailed === 0 ? "SUCCESS" : totalSuccess > 0 ? "SUCCESS" : "FAILED",
        productName: `Bulk Catalog Sync (${activeProducts.length} items)`,
        metaBatchHandle: handles.join(", "),
        metaResponse: { totalSuccess, totalFailed, handles },
        errorMessage: totalFailed > 0 ? `${totalFailed} products failed to batch upload` : null,
      });

      // 7. Update integration timestamp
      await db
        .update(schema.metaCatalogIntegrations)
        .set({
          lastSyncAt: new Date(),
          syncStatus: totalFailed === 0 ? "connected" : "error",
          updatedAt: new Date(),
        })
        .where(eq(schema.metaCatalogIntegrations.id, integration.id));

      await logAuditAction({
        userId,
        action: "TRIGGER_FACEBOOK_SHOP_BATCH_SYNC",
        targetType: "vendor",
        targetId: integration.catalogId,
        metadata: {
          orgId,
          totalProducts: activeProducts.length,
          totalSuccess,
          totalFailed,
        },
      });

      revalidatePath("/vendor/settings/facebook-shop");
      return {
        success: true,
        totalProducts: activeProducts.length,
        totalSuccess,
        totalFailed,
        handles,
      };
    });
  });

/**
 * Fetches Facebook Shop settings for the vendor console (masks sensitive access token).
 */
export const getFacebookShopSettingsAction = vendorAction.action(async ({ ctx }) => {
  const { orgId, db } = ctx;

  if (!orgId) {
    throw new ActionError("Not authorized: You must be signed in with an active organization.");
  }

  const [integration] = await db
    .select({
      id: schema.metaCatalogIntegrations.id,
      catalogId: schema.metaCatalogIntegrations.catalogId,
      brandName: schema.metaCatalogIntegrations.brandName,
      facebookPageId: schema.metaCatalogIntegrations.facebookPageId,
      businessManagerId: schema.metaCatalogIntegrations.businessManagerId,
      isEnabled: schema.metaCatalogIntegrations.isEnabled,
      autoSyncOnCreate: schema.metaCatalogIntegrations.autoSyncOnCreate,
      autoSyncOnUpdate: schema.metaCatalogIntegrations.autoSyncOnUpdate,
      autoSyncOnDelete: schema.metaCatalogIntegrations.autoSyncOnDelete,
      lastSyncAt: schema.metaCatalogIntegrations.lastSyncAt,
      syncStatus: schema.metaCatalogIntegrations.syncStatus,
      lastErrorMessage: schema.metaCatalogIntegrations.lastErrorMessage,
      hasToken: sql<boolean>`${schema.metaCatalogIntegrations.accessToken} IS NOT NULL AND ${schema.metaCatalogIntegrations.accessToken} != ''`,
    })
    .from(schema.metaCatalogIntegrations)
    .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
    .limit(1);

  return { integration: integration || null };
});

/**
 * Fetches recent sync logs for the vendor console.
 */
export const getFacebookShopSyncLogsAction = vendorAction
  .schema(getFacebookSyncLogsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { orgId, db } = ctx;

    if (!orgId) {
      throw new ActionError("Not authorized: You must be signed in with an active organization.");
    }

    const { page, pageSize } = parsedInput;
    const offset = (page - 1) * pageSize;

    const [logs, totalRow] = await Promise.all([
      db
        .select()
        .from(schema.metaCatalogSyncLogs)
        .where(eq(schema.metaCatalogSyncLogs.orgId, orgId))
        .orderBy(desc(schema.metaCatalogSyncLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.metaCatalogSyncLogs)
        .where(eq(schema.metaCatalogSyncLogs.orgId, orgId)),
    ]);

    return {
      logs,
      totalCount: totalRow[0]?.count ?? 0,
      page,
      pageSize,
    };
  });
