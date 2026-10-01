import { z } from "zod/v3";
import { auth } from "@clerk/nextjs/server";
import { computeMultiVendorRates } from "@/shared/shipping/rate-engine";
import { db } from "@/shared/db/client";
import { branches, branchInventory } from "@/shared/db/schema";
import { inArray } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";
import { apiSuccess, apiError } from "@/shared/api/response";
import { rateLimit } from "@/shared/security/rate-limit";

const shippingRatesSchema = z.object({
  cartItems: z
    .array(
      z.object({
        id: z.string().trim().min(1, "Item ID is required").max(128),
        quantity: z
          .number()
          .int()
          .positive("Quantity must be positive")
          .max(9999, "Quantity exceeds allowable calculation limit"),
        vendorOrgId: z.string().trim().max(128).optional(),
        branchId: z.string().trim().max(128).optional(),
        weightGrams: z.number().nonnegative().max(1_000_000).optional(),
        lengthCm: z.number().nonnegative().max(500).optional(),
        widthCm: z.number().nonnegative().max(500).optional(),
        heightCm: z.number().nonnegative().max(500).optional(),
      }),
    )
    .min(1, "At least one cart item is required")
    .max(50, "Cart item count exceeds maximum calculation limit"),
  destinationAddress: z.object({
    name: z.string().trim().max(100).optional().default("Customer"),
    street: z.string().trim().min(1, "Street address is required").max(200),
    city: z.string().trim().min(1, "City is required").max(100),
    state: z.string().trim().max(100).optional().default(""),
    postalCode: z.string().trim().max(20).optional().default(""),
    country: z.string().trim().min(2).max(3).toUpperCase().optional().default("LK"),
    phone: z.string().trim().max(30).optional(),
  }),
});

/**
 * Reject unpermitted HTTP methods (GET, PUT, DELETE, etc.) with explicit 405 Method Not Allowed.
 */
export async function GET() {
  return apiError("Method Not Allowed. Use POST with cart details and destination address.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

/**
 * Calculates live multi-vendor carrier shipping rates.
 *
 * Security Protections:
 * - Authentication: Requires signed-in Clerk user session (prevents unauthenticated rate enumeration and API cost abuse)
 * - Rate Limiting: 20 calls/min per authenticated user ID (fail-closed in production against carrier API quota abuse)
 * - IP Rate Limiting: 30 calls/min per client IP (defense-in-depth against credential stuffing / session cycling)
 * - Input Validation: Strict Zod schema preventing oversized payloads or excessive database batch lookups
 * - Non-cacheable: Private delivery quotes with addresses are strictly non-cacheable
 */
export async function POST(req: Request) {
  try {
    // 1. Mandatory Authentication Check
    const { userId } = await auth();
    if (!userId) {
      return apiError(
        "Unauthorized: Authentication is required to calculate live shipping rates.",
        {
          status: 401,
        },
      );
    }

    // 2. Multi-tier Rate Limiting
    const ip =
      req.headers.get("cf-connecting-ip")?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    try {
      // User-level rate limit: 20 req/min
      await rateLimit(20, 60 * 1000, `shipping-rates:user:${userId}`, { failClosed: true });
      // IP-level defense-in-depth rate limit: 30 req/min
      await rateLimit(30, 60 * 1000, `shipping-rates:ip:${ip}`, { failClosed: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Rate limit")) {
        logger.warn("[POST /api/shipping/rates] Rate limit exceeded", { userId, ip });
        return Response.json(
          {
            success: false,
            error: "Too many shipping rate requests. Please try again in a few moments.",
          },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
              "Cache-Control": "no-store",
            },
          },
        );
      }
      throw error;
    }

    // 3. Strict Input Schema Validation
    const body = await req.json();
    const parsed = shippingRatesSchema.parse(body);

    const productIds = parsed.cartItems.map((item) => item.id).filter(Boolean);

    // 4. Fetch branch assignments for products from branch_inventory table
    const productBranchMap = new Map<string, string>();
    if (productIds.length > 0) {
      const invRows = await db
        .select({
          productId: branchInventory.productId,
          branchId: branchInventory.branchId,
        })
        .from(branchInventory)
        .where(inArray(branchInventory.productId, productIds));

      for (const row of invRows) {
        if (row.productId && row.branchId) {
          productBranchMap.set(row.productId, row.branchId);
        }
      }
    }

    // 5. Resolve default branch for each vendor org as fallback
    const vendorOrgIds: string[] = [];
    for (const item of parsed.cartItems) {
      const orgId = item.vendorOrgId ?? "default_vendor";
      if (!vendorOrgIds.includes(orgId)) {
        vendorOrgIds.push(orgId);
      }
    }

    const orgDefaultBranchMap = new Map<
      string,
      { id: string; name: string; address: string | null; phone: string | null }
    >();
    const allBranchIdsToFetch = new Set<string>();

    if (vendorOrgIds.length > 0) {
      const dbOrgBranches = await db
        .select({
          id: branches.id,
          orgId: branches.orgId,
          name: branches.name,
          address: branches.address,
          phone: branches.phone,
          isDefault: branches.isDefault,
        })
        .from(branches)
        .where(inArray(branches.orgId, vendorOrgIds));

      for (const branch of dbOrgBranches) {
        allBranchIdsToFetch.add(branch.id);
        if (!orgDefaultBranchMap.has(branch.orgId) || branch.isDefault) {
          orgDefaultBranchMap.set(branch.orgId, branch);
        }
      }
    }

    // Include explicitly mapped branch IDs from productBranchMap and cartItems
    for (const item of parsed.cartItems) {
      const bId = item.branchId || productBranchMap.get(item.id);
      if (bId) allBranchIdsToFetch.add(bId);
    }

    // Fetch full details for all relevant branches
    const branchMapById = new Map<
      string,
      { id: string; name: string; address: string | null; phone: string | null }
    >();
    if (allBranchIdsToFetch.size > 0) {
      const fetchedBranches = await db
        .select({
          id: branches.id,
          name: branches.name,
          address: branches.address,
          phone: branches.phone,
        })
        .from(branches)
        .where(inArray(branches.id, Array.from(allBranchIdsToFetch)));

      for (const b of fetchedBranches) {
        branchMapById.set(b.id, b);
      }
    }

    // 6. Group items by (vendorOrgId + branchId)
    const itemsByVendorGroup = new Map<
      string,
      Array<{ id: string; quantity: number; weightGrams?: number }>
    >();
    const groupBranchMap = new Map<
      string,
      { id: string; name: string; address: string | null; phone: string | null }
    >();

    for (const item of parsed.cartItems) {
      const orgId = item.vendorOrgId ?? "default_vendor";
      const resolvedBranchId =
        item.branchId || productBranchMap.get(item.id) || orgDefaultBranchMap.get(orgId)?.id;
      const groupKey = resolvedBranchId ? `${orgId}:${resolvedBranchId}` : orgId;

      const list = itemsByVendorGroup.get(groupKey) ?? [];
      list.push(item);
      itemsByVendorGroup.set(groupKey, list);

      if (resolvedBranchId && branchMapById.has(resolvedBranchId)) {
        groupBranchMap.set(groupKey, branchMapById.get(resolvedBranchId)!);
      } else if (orgDefaultBranchMap.has(orgId)) {
        groupBranchMap.set(groupKey, orgDefaultBranchMap.get(orgId)!);
      }
    }

    const result = await computeMultiVendorRates({
      itemsByVendor: itemsByVendorGroup,
      destination: {
        name: parsed.destinationAddress.name,
        street: parsed.destinationAddress.street,
        city: parsed.destinationAddress.city,
        state: parsed.destinationAddress.state,
        postalCode: parsed.destinationAddress.postalCode,
        country: parsed.destinationAddress.country,
        phone: parsed.destinationAddress.phone,
      },
      vendorBranchMap: groupBranchMap,
    });

    const response = apiSuccess(result);
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    return response;
  } catch (err: unknown) {
    logger.error("[POST /api/shipping/rates] Error", err);
    if (err instanceof z.ZodError) {
      return apiError("Invalid input parameters", {
        status: 400,
        details: err.issues.map((i) => i.message),
      });
    }
    return apiError("Failed to calculate shipping rates", { status: 500 });
  }
}
