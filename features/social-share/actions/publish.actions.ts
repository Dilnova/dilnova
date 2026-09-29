"use server";

import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, vendorAction, ActionError } from "@/lib/safe-action";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { testWebhookSchema, manualPublishProductSchema } from "../schema";
import { dispatchProductWebhook } from "../services/webhook-dispatcher";
import { dispatchProductSocialPublishing } from "../dispatcher";

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
 * Manually dispatches social publishing for a single product across enabled channels.
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
