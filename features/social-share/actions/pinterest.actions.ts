"use server";

import * as schema from "@/shared/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, ActionError } from "@/lib/safe-action";
import { logger } from "@/shared/logging/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { getOrgCurrencySettings } from "@/shared/currency/exchange-rates.service";
import {
  testPinterestConnectionSchema,
  discoverPinterestBoardsSchema,
  triggerBatchPostSchema,
} from "../schema";
import {
  verifyPinterestAccount,
  fetchPinterestBoards,
  createPinterestProductPin,
} from "../services/pinterest";

/**
 * Tests Pinterest API connection and verifies token.
 */
export const testPinterestConnectionAction = orgAdminAction
  .schema(testPinterestConnectionSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      let token = parsedInput.accessToken?.trim();
      if (!token || token.includes("••••")) {
        const [integration] = await db
          .select({ pinterestAccessToken: schema.metaCatalogIntegrations.pinterestAccessToken })
          .from(schema.metaCatalogIntegrations)
          .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
          .limit(1);

        if (integration?.pinterestAccessToken) {
          token = integration.pinterestAccessToken;
        }
      }

      if (!token) {
        throw new ActionError("Pinterest Access Token is required.");
      }

      const res = await verifyPinterestAccount(token);
      if (!res.success || !res.user) {
        throw new ActionError(res.error || "Failed to verify Pinterest connection.");
      }

      return {
        success: true,
        username: res.user.username,
        businessName: res.user.businessName,
        profileImage: res.user.profileImage,
      };
    });
  });

/**
 * Auto-detects boards on the vendor's Pinterest account.
 */
export const discoverPinterestBoardsAction = orgAdminAction
  .schema(discoverPinterestBoardsSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      let token = parsedInput.accessToken?.trim();
      if (!token || token.includes("••••")) {
        const [integration] = await db
          .select({ pinterestAccessToken: schema.metaCatalogIntegrations.pinterestAccessToken })
          .from(schema.metaCatalogIntegrations)
          .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
          .limit(1);

        if (integration?.pinterestAccessToken) {
          token = integration.pinterestAccessToken;
        }
      }

      if (!token) {
        throw new ActionError("Pinterest Access Token is required.");
      }

      const res = await fetchPinterestBoards(token);
      if (!res.success) {
        throw new ActionError(res.error || "Failed to retrieve Pinterest boards.");
      }

      return {
        success: true,
        boards: res.boards,
      };
    });
  });

/**
 * Batch publishes all active catalog products to the configured Pinterest Board.
 */
export const triggerBatchPinterestPublishAction = orgAdminAction
  .schema(triggerBatchPostSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(5, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      const { forceRepost } = parsedInput;

      const [integration] = await db
        .select()
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      if (!integration?.pinterestBoardId || !integration.pinterestAccessToken) {
        throw new ActionError("Pinterest Board and Access Token are not configured.");
      }

      const pinToken = integration.pinterestAccessToken;
      const boardId = integration.pinterestBoardId;

      const activeProducts = await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")));

      if (activeProducts.length === 0) {
        return {
          totalSuccess: 0,
          totalFailed: 0,
          skippedCount: 0,
          alreadySyncedCount: 0,
          totalCount: 0,
          message: "No active products available to sync to Pinterest.",
        };
      }

      const alreadyPinnedProductIds = new Set<string>();
      if (!forceRepost) {
        const existingSuccessPins = await db
          .select({ productId: schema.metaCatalogSyncLogs.productId })
          .from(schema.metaCatalogSyncLogs)
          .where(
            and(
              eq(schema.metaCatalogSyncLogs.orgId, orgId),
              eq(schema.metaCatalogSyncLogs.action, "PINTEREST_PIN"),
              eq(schema.metaCatalogSyncLogs.status, "SUCCESS"),
            ),
          );
        for (const p of existingSuccessPins) {
          if (p.productId) alreadyPinnedProductIds.add(p.productId);
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
            action: "PINTEREST_PIN",
            status: "SKIPPED",
            productName: prod.name,
            productSku: prod.sku,
            errorMessage: "Skipped: No image or media uploaded",
          });
          continue;
        }

        if (!forceRepost && alreadyPinnedProductIds.has(prod.id)) {
          alreadySyncedCount++;
          continue;
        }

        try {
          const res = await createPinterestProductPin({
            boardId,
            accessToken: pinToken,
            product: prod,
            currency,
            brandName,
          });

          if (res.success) {
            totalSuccess++;
            alreadyPinnedProductIds.add(prod.id);
            await db.insert(schema.metaCatalogSyncLogs).values({
              orgId,
              productId: prod.id,
              action: "PINTEREST_PIN",
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
              action: "PINTEREST_PIN",
              status: "FAILED",
              productName: prod.name,
              productSku: prod.sku,
              errorMessage: res.error || "Failed to create Pin",
            });
          }

          // Delay between requests to respect Pinterest rate limits
          await new Promise((r) => setTimeout(r, 600));
        } catch (err) {
          totalFailed++;
          logger.error("Error bulk creating Pinterest Pin", { prodId: prod.id, err });
        }
      }

      revalidatePath("/vendor");
      revalidatePath("/vendor/settings/social");

      return {
        totalSuccess,
        totalFailed,
        skippedCount,
        alreadySyncedCount,
        totalCount: activeProducts.length,
        message: `Pinterest Sync: ${totalSuccess} new pinned, ${alreadySyncedCount} already on Board (skipped), ${skippedCount} skipped (no media), ${totalFailed} failed.`,
      };
    });
  });
