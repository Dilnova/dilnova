"use server";

import { db } from "@/shared/db/client";
import { orgSettings } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import { updateOrgCurrencySchema } from "@/features/organization/schema";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { orgAdminAction, ActionError } from "@/lib/safe-action";

export const updateOrgCurrencyAction = orgAdminAction
  .schema(updateOrgCurrencySchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000);

      // Multi-tenant guard: verify session active orgId matches target org
      if (!ctx.orgId || ctx.orgId !== parsedInput.organizationId) {
        throw new ActionError("Not authorized: You do not belong to this organization.");
      }

      const upperCurrency = parsedInput.baseCurrency.toUpperCase();

      // Upsert org_settings
      const [existing] = await db
        .select()
        .from(orgSettings)
        .where(eq(orgSettings.orgId, parsedInput.organizationId))
        .limit(1);

      if (existing) {
        await db
          .update(orgSettings)
          .set({
            baseCurrency: upperCurrency,
            fxMarkupPercent: parsedInput.fxMarkupPercent,
            updatedAt: new Date(),
          })
          .where(eq(orgSettings.orgId, parsedInput.organizationId));
      } else {
        await db.insert(orgSettings).values({
          orgId: parsedInput.organizationId,
          baseCurrency: upperCurrency,
          fxMarkupPercent: parsedInput.fxMarkupPercent,
          updatedAt: new Date(),
        });
      }

      await logAuditAction({
        userId: ctx.userId,
        action: "UPDATE_VENDOR_CURRENCY_SETTINGS",
        targetType: "vendor",
        targetId: parsedInput.organizationId,
        metadata: {
          baseCurrency: upperCurrency,
          fxMarkupPercent: parsedInput.fxMarkupPercent,
        },
      });

      revalidatePath("/admin");
      revalidateVendorConsole();
      revalidatePath("/cart");

      return { success: true, baseCurrency: upperCurrency };
    });
  });
