"use server";

import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAdminAction, vendorAction, ActionError } from "@/lib/safe-action";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import {
  checkVendorSocialTokensHealth,
  refreshAndPersistSocialTokens,
  SocialTokensHealthReport,
} from "../services/token-health";
import { z } from "zod/v3";

const emptyInputSchema = z.object({}).optional();

/**
 * Checks live health and expiration for all social tokens configured for the active vendor organization.
 */
export const checkSocialTokensHealthAction = vendorAction
  .schema(emptyInputSchema)
  .action(async ({ ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      const [integration] = await db
        .select()
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      const report: SocialTokensHealthReport = await checkVendorSocialTokensHealth(integration);

      return {
        success: true,
        report,
      };
    });
  });

/**
 * Proactively renews expiring or desynchronized social tokens for the active organization.
 */
export const refreshSocialTokensAction = orgAdminAction
  .schema(emptyInputSchema)
  .action(async ({ ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);
      const { orgId, db } = ctx;

      if (!orgId) {
        throw new ActionError("Not authorized: Active organization required.");
      }

      const result = await refreshAndPersistSocialTokens({
        orgId,
        dbClient: db,
      });

      revalidatePath("/vendor/settings/social");
      revalidatePath("/vendor/settings/facebook-shop");

      return {
        success: true,
        report: result.report,
        refreshedChannels: result.refreshedChannels,
      };
    });
  });
