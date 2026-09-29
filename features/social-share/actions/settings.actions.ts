"use server";

import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, vendorAction, ActionError } from "@/lib/safe-action";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { saveSocialSettingsSchema } from "../schema";

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
      if (parsedInput.pinterestBoardId !== undefined) {
        updateValues.pinterestBoardId = parsedInput.pinterestBoardId || null;
      }
      if (parsedInput.pinterestBoardName !== undefined) {
        updateValues.pinterestBoardName = parsedInput.pinterestBoardName || null;
      }
      if (parsedInput.pinterestAccessToken && !parsedInput.pinterestAccessToken.includes("••••")) {
        updateValues.pinterestAccessToken = parsedInput.pinterestAccessToken;
      }
      if (parsedInput.autoPostPinterest !== undefined) {
        updateValues.autoPostPinterest = parsedInput.autoPostPinterest;
      }
      if (parsedInput.googleMerchantId !== undefined) {
        updateValues.googleMerchantId = parsedInput.googleMerchantId || null;
      }
      if (parsedInput.autoSyncGoogle !== undefined) {
        updateValues.autoSyncGoogle = parsedInput.autoSyncGoogle;
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
          pinterestAccessToken: parsedInput.pinterestAccessToken || null,
          pinterestBoardId: parsedInput.pinterestBoardId || null,
          pinterestBoardName: parsedInput.pinterestBoardName || null,
          autoPostPinterest: parsedInput.autoPostPinterest || false,
          googleMerchantId: parsedInput.googleMerchantId || null,
          autoSyncGoogle: parsedInput.autoSyncGoogle ?? true,
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
      hasPinterestAccessToken: Boolean(integration.pinterestAccessToken),
      accessToken: integration.accessToken ? "••••••••••••••••" : "",
      facebookPageAccessToken: integration.facebookPageAccessToken ? "••••••••••••••••" : "",
      pinterestAccessToken: integration.pinterestAccessToken ? "••••••••••••••••" : "",
    },
  };
});
