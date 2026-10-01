import { NextRequest, NextResponse } from "next/server";
import { generateGoogleMerchantFeed } from "@/features/google-merchant/services/feed-generator";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";
import crypto from "crypto";

function timingSafeTokenMatch(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || undefined;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
    const token = bearerToken || searchParams.get("token") || undefined;
    const rawScope = searchParams.get("scope");

    // If orgId is provided, enforce fail-closed authorization and constant-time token verification
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

      if (!integration) {
        return new NextResponse("Google Shopping feed is not configured for this organization", {
          status: 403,
        });
      }

      if (!integration.isEnabled || !integration.autoSyncGoogle) {
        return new NextResponse(
          "Google Shopping feed is currently disabled for this organization",
          {
            status: 403,
          },
        );
      }

      if (!integration.googleFeedToken) {
        return new NextResponse(
          "Unauthorized: Google Feed token not configured for this organization",
          { status: 401 },
        );
      }

      if (!token || !timingSafeTokenMatch(integration.googleFeedToken, token)) {
        return new NextResponse("Unauthorized: Invalid Google Feed token", { status: 401 });
      }
    }

    // Resolve base URL and host
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = host
      ? `${protocol}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

    // Determine scope: explicit ?scope= takes precedence, then host detection
    const isDilstarHost = host.includes("dilstar.pp.ua");
    const scope: "dilstar" | "all" =
      rawScope === "dilstar"
        ? "dilstar"
        : rawScope === "all"
          ? "all"
          : isDilstarHost
            ? "dilstar"
            : "all";

    const xml = await generateGoogleMerchantFeed({
      orgId,
      baseUrl,
      scope,
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
