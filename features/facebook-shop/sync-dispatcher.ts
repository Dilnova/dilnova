import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";
import { getOrgCurrencySettings } from "@/shared/currency/exchange-rates.service";
import { formatDilnovaProductForMeta, sendMetaItemsBatch } from "./services/meta-api";
import { MetaBatchPayload } from "./types";

interface DispatchSyncParams {
  orgId: string;
  productId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  productNameHint?: string;
}

/**
 * Non-blocking dispatcher to synchronize product lifecycle events with Meta Commerce Catalog.
 * Swallows errors gracefully and records all outcomes into metaCatalogSyncLogs.
 */
export async function dispatchFacebookShopSync({
  orgId,
  productId,
  action,
  productNameHint,
}: DispatchSyncParams): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch integration credentials for this organization
    const [integration] = await db
      .select()
      .from(schema.metaCatalogIntegrations)
      .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
      .limit(1);

    if (!integration || !integration.isEnabled) {
      return { success: false, error: "Integration not configured or disabled" };
    }

    // Check specific action sync toggle
    if (action === "CREATE" && !integration.autoSyncOnCreate) {
      return { success: false, error: "Auto-sync on create is disabled" };
    }
    if (action === "UPDATE" && !integration.autoSyncOnUpdate) {
      return { success: false, error: "Auto-sync on update is disabled" };
    }
    if (action === "DELETE" && !integration.autoSyncOnDelete) {
      return { success: false, error: "Auto-sync on delete is disabled" };
    }

    let payload: MetaBatchPayload;
    let productName = productNameHint || "Product";
    let productSku: string | null = null;

    if (action === "DELETE") {
      payload = {
        item_type: "PRODUCT_ITEM",
        requests: [
          {
            method: "DELETE",
            retailer_id: productId,
          },
        ],
      };
    } else {
      // 2. Fetch product details & inventory
      const [prod] = await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.id, productId), eq(schema.products.orgId, orgId)))
        .limit(1);

      if (!prod) {
        logger.warn("Facebook shop sync skipped: Product not found", { orgId, productId });
        return { success: false, error: "Product not found" };
      }

      productName = prod.name;
      productSku = prod.sku;

      const [inv] = await db
        .select({ quantity: schema.inventory.quantity })
        .from(schema.inventory)
        .where(eq(schema.inventory.productId, productId))
        .limit(1);

      const quantity = inv?.quantity ?? (prod.type === "product" ? 0 : 1);
      const orgCurrency = await getOrgCurrencySettings(orgId);

      const formatted = formatDilnovaProductForMeta({
        product: prod,
        quantity,
        currency: orgCurrency.baseCurrency || "LKR",
        brandName: integration.brandName,
      });

      payload = {
        item_type: "PRODUCT_ITEM",
        requests: [
          {
            method: "UPDATE",
            data: formatted,
          },
        ],
      };
    }

    // 3. Send batch request to Meta Graph API
    const response = await sendMetaItemsBatch({
      catalogId: integration.catalogId,
      accessToken: integration.accessToken,
      payload,
    });

    const isSuccess = !response.error;
    const batchHandle = response.handles?.[0] || null;
    const errorMessage = response.error?.message || null;

    // 4. Log sync execution
    await db.insert(schema.metaCatalogSyncLogs).values({
      orgId,
      productId: action === "DELETE" ? null : productId,
      action,
      status: isSuccess ? "SUCCESS" : "FAILED",
      productName,
      productSku,
      metaBatchHandle: batchHandle,
      metaResponse: response as unknown as Record<string, unknown>,
      errorMessage,
    });

    // 5. Update integration status & last sync timestamp
    await db
      .update(schema.metaCatalogIntegrations)
      .set({
        lastSyncAt: new Date(),
        syncStatus: isSuccess ? "connected" : "error",
        lastErrorMessage: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(schema.metaCatalogIntegrations.id, integration.id));

    return { success: isSuccess, error: errorMessage || undefined };
  } catch (error) {
    logger.error("Unhandled error in dispatchFacebookShopSync", {
      orgId,
      productId,
      action,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error during Facebook Shop sync",
    };
  }
}
