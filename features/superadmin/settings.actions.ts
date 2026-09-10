"use server";

import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import {
  updateSystemSettingSchema,
  updateCheckoutOptionsCatalogSchema,
  checkFeedHealthSchema,
  verifyHeadMetadataSchema,
} from "@/features/superadmin/schema";
import { CHECKOUT_OPTIONS_CATALOG_KEY } from "@/features/organization/checkout-options.shared";
import { syncSettingToRedis, getSystemSetting } from "@/shared/platform/settings";
import { superadminAction, ActionError } from "@/lib/safe-action";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { generateGoogleMerchantFeed } from "@/features/google-merchant/services/feed-generator";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";

/**
 * Enterprise Server Action to configure system-wide parameters (e.g., max media upload limit).
 * Restricted to authenticated global admin users.
 */
export const updateSystemSettingAction = superadminAction
  .schema(updateSystemSettingSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000, ctx.userId, { failClosed: true }); // Max 20 superadmin operations per minute per user

      if (parsedInput.key === CHECKOUT_OPTIONS_CATALOG_KEY) {
        try {
          const payload = JSON.parse(parsedInput.value);
          const catalogParsed = updateCheckoutOptionsCatalogSchema.safeParse({ options: payload });
          if (!catalogParsed.success) {
            throw new ActionError(
              `Strict validation failed for catalog options: ${catalogParsed.error.issues[0]?.message}`,
            );
          }
        } catch (err) {
          throw new ActionError(
            `Invalid JSON payload for checkout options catalog: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // Check if setting already exists
      const [existing] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, parsedInput.key))
        .limit(1);

      if (existing) {
        // Update
        await db
          .update(schema.systemSettings)
          .set({
            value: parsedInput.value,
            updatedAt: new Date(),
          })
          .where(eq(schema.systemSettings.key, parsedInput.key));
      } else {
        // Insert
        await db.insert(schema.systemSettings).values({
          key: parsedInput.key,
          value: parsedInput.value,
        });
      }

      // Sync to Edge Cache Fallback (non-blocking if it fails)
      await syncSettingToRedis(parsedInput.key, parsedInput.value);

      await logAuditAction({
        userId: ctx.userId,
        action: "UPDATE_SYSTEM_SETTING",
        targetType: "system_setting",
        targetId: parsedInput.key,
        metadata: { value: parsedInput.value },
        strict: true,
      });

      // Clear cache for admin panels and vendor portals to reflect configuration updates immediately
      revalidateTag("system-settings", "max");
      revalidatePath("/superadmin");
      revalidateVendorConsole();
      revalidatePath("/", "layout");

      return { success: true };
    });
  });

/**
 * Server Action to check Google Merchant feed health, item count, and latency in real time.
 */
export const checkGoogleMerchantFeedHealthAction = superadminAction
  .schema(checkFeedHealthSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000, ctx.userId, { failClosed: true });

      const startTime = performance.now();
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

      try {
        const xml = await generateGoogleMerchantFeed({
          baseUrl,
          scope: parsedInput.scope,
        });

        const latencyMs = Math.round(performance.now() - startTime);
        const itemCount = (xml.match(/<item>/g) || []).length;

        const buildDateMatch = xml.match(/<lastBuildDate>(.*?)<\/lastBuildDate>/);
        const lastBuildDate = buildDateMatch ? buildDateMatch[1] : new Date().toUTCString();

        // Extract up to 4 sample product titles
        const sampleTitles: string[] = [];
        const itemRegex =
          /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>[\s\S]*?<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && sampleTitles.length < 4) {
          if (match[1]?.trim()) {
            sampleTitles.push(match[1].trim());
          }
        }

        return {
          success: true,
          scope: parsedInput.scope,
          productCount: itemCount,
          latencyMs,
          lastBuildDate,
          sampleTitles,
          status: 200,
        };
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to generate Google Merchant feed.";
        return {
          success: false,
          scope: parsedInput.scope,
          productCount: 0,
          latencyMs: Math.round(performance.now() - startTime),
          lastBuildDate: null,
          sampleTitles: [],
          status: 500,
          error: errorMsg,
        };
      }
    });
  });

/**
 * Server Action to inspect active SEO & Domain verification meta tags currently served in <head>.
 */
export const verifyHeadMetadataAction = superadminAction
  .schema(verifyHeadMetadataSchema)
  .action(async ({ ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000, ctx.userId, { failClosed: true });

      const [pinterest, google, facebook] = await Promise.all([
        getSystemSetting("pinterest_domain_verify", process.env.PINTEREST_DOMAIN_VERIFY ?? ""),
        getSystemSetting("google_site_verify", process.env.GOOGLE_SITE_VERIFY ?? ""),
        getSystemSetting("facebook_domain_verify", process.env.FACEBOOK_DOMAIN_VERIFY ?? ""),
      ]);

      const pinterestVal = pinterest?.trim() || "";
      const googleVal = google?.trim() || "";
      const facebookVal = facebook?.trim() || "";

      return {
        success: true,
        pinterest: {
          configured: Boolean(pinterestVal),
          tag: pinterestVal ? `<meta name="p:domain_verify" content="${pinterestVal}" />` : null,
          value: pinterestVal || null,
        },
        google: {
          configured: Boolean(googleVal),
          tag: googleVal ? `<meta name="google-site-verification" content="${googleVal}" />` : null,
          value: googleVal || null,
        },
        facebook: {
          configured: Boolean(facebookVal),
          tag: facebookVal
            ? `<meta name="facebook-domain-verification" content="${facebookVal}" />`
            : null,
          value: facebookVal || null,
        },
        allActive: Boolean(pinterestVal && googleVal && facebookVal),
        checkedAt: new Date().toISOString(),
      };
    });
  });
