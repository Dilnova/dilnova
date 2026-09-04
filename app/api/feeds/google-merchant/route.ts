import { NextRequest, NextResponse } from "next/server";
import { generateGoogleMerchantFeed } from "@/features/google-merchant/services/feed-generator";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || undefined;
    const token = searchParams.get("token") || undefined;

    // If orgId is provided, verify token if token protection is set
    if (orgId) {
      const [integration] = await db
        .select({
          googleFeedToken: schema.metaCatalogIntegrations.googleFeedToken,
          isEnabled: schema.metaCatalogIntegrations.isEnabled,
          autoSyncGoogle: schema.metaCatalogIntegrations.autoSyncGoogle,
        })
        .from(schema.metaCatalogIntegrations)
        .where(eq(schema.metaCatalogIntegrations.orgId, orgId))
        .limit(1);

      if (integration?.googleFeedToken && integration.googleFeedToken !== token) {
        return new NextResponse("Unauthorized: Invalid Google Feed token", { status: 401 });
      }

      if (integration && (!integration.isEnabled || !integration.autoSyncGoogle)) {
        return new NextResponse(
          "Google Shopping feed is currently disabled for this organization",
          {
            status: 403,
          },
        );
      }
    }

    // Resolve base URL
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = host
      ? `${protocol}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

    const xml = await generateGoogleMerchantFeed({
      orgId,
      baseUrl,
    });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "X-Robots-Tag": "noindex", // Prevents search engines from indexing the raw XML feed itself
      },
    });
  } catch (error) {
    logger.error("Failed to generate Google Merchant feed", { error });
    return new NextResponse("Internal Server Error generating feed", { status: 500 });
  }
}
