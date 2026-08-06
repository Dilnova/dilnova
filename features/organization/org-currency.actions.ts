"use server";

import { db } from "@/shared/db/client";
import { orgSettings, taxClasses } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import { updateOrgCurrencySchema, updateOrgDefaultTaxSchema } from "@/features/organization/schema";
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
            defaultTaxClassId: parsedInput.defaultTaxClassId || null,
            updatedAt: new Date(),
          })
          .where(eq(orgSettings.orgId, parsedInput.organizationId));
      } else {
        await db.insert(orgSettings).values({
          orgId: parsedInput.organizationId,
          baseCurrency: upperCurrency,
          fxMarkupPercent: parsedInput.fxMarkupPercent,
          defaultTaxClassId: parsedInput.defaultTaxClassId || null,
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
          defaultTaxClassId: parsedInput.defaultTaxClassId,
        },
      });

      revalidatePath("/admin");
      revalidateVendorConsole();
      revalidatePath("/cart");

      return { success: true, baseCurrency: upperCurrency };
    });
  });

export const updateOrgDefaultTaxAction = orgAdminAction
  .schema(updateOrgDefaultTaxSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000);

      if (!ctx.orgId || ctx.orgId !== parsedInput.organizationId) {
        throw new ActionError("Not authorized: You do not belong to this organization.");
      }

      let targetTaxClassId = parsedInput.defaultTaxClassId || null;

      if (
        parsedInput.customTaxRatePercent != null &&
        typeof parsedInput.customTaxRatePercent === "number" &&
        !isNaN(parsedInput.customTaxRatePercent)
      ) {
        const rate = parsedInput.customTaxRatePercent;
        const customName = parsedInput.customTaxName?.trim() || `Custom Tax (${rate}%)`;
        const code = `CUSTOM_TAX_${parsedInput.organizationId}_${rate.toString().replace(".", "_")}`;

        const [existing] = await db
          .select()
          .from(taxClasses)
          .where(eq(taxClasses.code, code))
          .limit(1);

        if (existing) {
          targetTaxClassId = existing.id;
          if (parsedInput.customTaxName) {
            await db
              .update(taxClasses)
              .set({ name: customName })
              .where(eq(taxClasses.id, existing.id));
          }
        } else {
          const [created] = await db
            .insert(taxClasses)
            .values({
              name: customName,
              code,
              ratePercent: rate,
              orgId: parsedInput.organizationId,
            })
            .returning();
          if (created) targetTaxClassId = created.id;
        }
      }

      const [existing] = await db
        .select()
        .from(orgSettings)
        .where(eq(orgSettings.orgId, parsedInput.organizationId))
        .limit(1);

      const setClause: Record<string, unknown> = {
        defaultTaxClassId: targetTaxClassId,
        updatedAt: new Date(),
      };
      if (parsedInput.allowedTaxClassIds !== undefined) {
        setClause.allowedTaxClassIds = parsedInput.allowedTaxClassIds;
      }

      if (existing) {
        await db
          .update(orgSettings)
          .set(setClause)
          .where(eq(orgSettings.orgId, parsedInput.organizationId));
      } else {
        await db.insert(orgSettings).values({
          orgId: parsedInput.organizationId,
          defaultTaxClassId: targetTaxClassId,
          allowedTaxClassIds: parsedInput.allowedTaxClassIds || [],
          updatedAt: new Date(),
        });
      }

      await logAuditAction({
        userId: ctx.userId,
        action: "UPDATE_VENDOR_DEFAULT_TAX_SETTINGS",
        targetType: "vendor",
        targetId: parsedInput.organizationId,
        metadata: {
          defaultTaxClassId: targetTaxClassId,
          customTaxRatePercent: parsedInput.customTaxRatePercent,
          allowedTaxClassIds: parsedInput.allowedTaxClassIds,
        },
      });

      revalidatePath("/admin");
      revalidateVendorConsole();
      revalidatePath("/cart");

      return { success: true };
    });
  });

export const deleteOrgCustomTaxAction = orgAdminAction
  .schema(
    updateOrgDefaultTaxSchema.pick({ organizationId: true }).extend({
      taxClassId: updateOrgDefaultTaxSchema.shape.defaultTaxClassId.unwrap().unwrap(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      if (!ctx.orgId || ctx.orgId !== parsedInput.organizationId) {
        throw new ActionError("Not authorized.");
      }

      await db
        .delete(taxClasses)
        .where(
          and(
            eq(taxClasses.id, parsedInput.taxClassId),
            eq(taxClasses.orgId, parsedInput.organizationId),
          ),
        );

      revalidatePath("/admin");
      revalidateVendorConsole();
      revalidatePath("/cart");

      return { success: true };
    });
  });

export const updateOrgCustomTaxAction = orgAdminAction
  .schema(
    updateOrgDefaultTaxSchema.pick({ organizationId: true }).extend({
      taxClassId: updateOrgDefaultTaxSchema.shape.defaultTaxClassId.unwrap().unwrap(),
      name: updateOrgDefaultTaxSchema.shape.organizationId,
      ratePercent: updateOrgDefaultTaxSchema.shape.customTaxRatePercent.unwrap().unwrap(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      if (!ctx.orgId || ctx.orgId !== parsedInput.organizationId) {
        throw new ActionError("Not authorized.");
      }

      await db
        .update(taxClasses)
        .set({
          name: parsedInput.name,
          ratePercent: parsedInput.ratePercent,
        })
        .where(
          and(
            eq(taxClasses.id, parsedInput.taxClassId),
            eq(taxClasses.orgId, parsedInput.organizationId),
          ),
        );

      revalidatePath("/admin");
      revalidateVendorConsole();
      revalidatePath("/cart");

      return { success: true };
    });
  });
