"use server";

import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, vendorAction, ActionError } from "@/lib/safe-action";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { validateCatalogForGoogle } from "./services/feed-generator";
import { z } from "zod/v3";
import crypto from "crypto";

const saveGoogleSettingsSchema = z.object({
  googleMerchantId: z.string().trim().max(100).optional().nullable(),
  autoSyncGoogle: z.boolean().default(true),
});

/**
 * Fetches Google Merchant Center feed settings for the active vendor organization.
 */
export const getGoogleMerchantSettingsAction = vendorAction.action(async ({ ctx }) => {
  const { orgId, db } = ctx;

  if (!orgId) {
    throw new ActionError("Not authorized: You must be signed in with an active organization.");
  }

  const [integration] = await db
    .select({
      id: schema.metaCatalogIntegrations.id,
      googleMerchantId: schema.metaCatalogIntegrations.googleMerchantId,
      googleFeedToken: schema.metaCatalogIntegrations.googleFeedToken,
      autoSyncGoogle: schema.metaCatalogIntegrations.autoSyncGoogle,
      isEnabled: schema.metaCatalogIntegrations.isEnabled,
      brandName: schema.metaCatalogIntegrations.brandName,
    })
    .from(schema.metaCatalogIntegrations)
    .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
    .limit(1);

  // If no feed token exists yet, generate one automatically
  let feedToken = integration?.googleFeedToken;
  if (integration && !feedToken) {
    feedToken = crypto.randomBytes(16).toString("hex");
    await db
      .update(schema.metaCatalogIntegrations)
      .set({ googleFeedToken: feedToken, updatedAt: new Date() })
      .where(eq(schema.metaCatalogIntegrations.id, integration.id));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dilnova.com";
  const feedUrl = `${baseUrl}/api/feeds/google-merchant?orgId=${encodeURIComponent(orgId)}${
    feedToken ? `&token=${encodeURIComponent(feedToken)}` : ""
  }`;

  return {
    settings: {
      googleMerchantId: integration?.googleMerchantId || "",
      googleFeedToken: feedToken || "",
      autoSyncGoogle: integration?.autoSyncGoogle ?? true,
      isEnabled: integration?.isEnabled ?? true,
      feedUrl,
    },
  };
});

/**
 * Saves Google Merchant Center settings (Merchant ID, auto-sync toggle).
 */
export const saveGoogleMerchantSettingsAction = orgAdminAction
  .schema(saveGoogleSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, orgId, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      const [existing] = await db
        .select({ id: schema.metaCatalogIntegrations.id })
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      if (existing) {
        await db
          .update(schema.metaCatalogIntegrations)
          .set({
            googleMerchantId: parsedInput.googleMerchantId || null,
            autoSyncGoogle: parsedInput.autoSyncGoogle,
            updatedAt: new Date(),
          })
          .where(eq(schema.metaCatalogIntegrations.id, existing.id));
      } else {
        const feedToken = crypto.randomBytes(16).toString("hex");
        await db.insert(schema.metaCatalogIntegrations).values({
          orgId,
          catalogId: "",
          accessToken: "",
          googleMerchantId: parsedInput.googleMerchantId || null,
          googleFeedToken: feedToken,
          autoSyncGoogle: parsedInput.autoSyncGoogle,
        });
      }

      await logAuditAction({
        userId,
        action: "UPDATE_GOOGLE_MERCHANT_SETTINGS",
        targetType: "vendor",
        targetId: orgId,
        metadata: {
          googleMerchantId: parsedInput.googleMerchantId,
          autoSyncGoogle: parsedInput.autoSyncGoogle,
        },
      });

      revalidatePath("/vendor/settings/facebook-shop");
      return { success: true };
    });
  });

/**
 * Regenerates the secret feed token for the Google Merchant feed URL.
 */
export const regenerateGoogleFeedTokenAction = orgAdminAction.action(async ({ ctx }) => {
  const { userId, orgId, db } = ctx;

  return runWithCorrelationId(async () => {
    await rateLimit(5, 60 * 1000);

    if (!orgId) {
      throw new ActionError("Not authorized: Active organization required.");
    }

    const newToken = crypto.randomBytes(16).toString("hex");

    const [existing] = await db
      .select({ id: schema.metaCatalogIntegrations.id })
      .from(schema.metaCatalogIntegrations)
      .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
      .limit(1);

    if (existing) {
      await db
        .update(schema.metaCatalogIntegrations)
        .set({ googleFeedToken: newToken, updatedAt: new Date() })
        .where(eq(schema.metaCatalogIntegrations.id, existing.id));
    } else {
      await db.insert(schema.metaCatalogIntegrations).values({
        orgId,
        catalogId: "",
        accessToken: "",
        googleFeedToken: newToken,
      });
    }

    await logAuditAction({
      userId,
      action: "REGENERATE_GOOGLE_FEED_TOKEN",
      targetType: "vendor",
      targetId: orgId,
      metadata: { orgId },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dilnova.com";
    const feedUrl = `${baseUrl}/api/feeds/google-merchant?orgId=${encodeURIComponent(orgId)}&token=${encodeURIComponent(newToken)}`;

    revalidatePath("/vendor/settings/facebook-shop");
    return { success: true, feedToken: newToken, feedUrl };
  });
});

/**
 * Validates active catalog products against Google Merchant Center requirements.
 */
export const validateGoogleCatalogAction = vendorAction.action(async ({ ctx }) => {
  const { orgId } = ctx;

  if (!orgId) {
    throw new ActionError("Not authorized: Active organization required.");
  }

  const result = await validateCatalogForGoogle(orgId);
  return { success: true, validation: result };
});
