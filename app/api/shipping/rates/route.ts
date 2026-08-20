import { NextResponse } from "next/server";
import { z } from "zod/v3";
import { auth } from "@clerk/nextjs/server";
import { computeMultiVendorRates } from "@/shared/shipping/rate-engine";
import { db } from "@/shared/db/client";
import { branches, branchInventory } from "@/shared/db/schema";
import { inArray } from "drizzle-orm";

const shippingRatesSchema = z.object({
  cartItems: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().positive(),
      vendorOrgId: z.string().optional(),
      branchId: z.string().optional(),
      weightGrams: z.number().optional(),
      lengthCm: z.number().optional(),
      widthCm: z.number().optional(),
      heightCm: z.number().optional(),
    }),
  ),
  destinationAddress: z.object({
    name: z.string().optional().default("Customer"),
    street: z.string(),
    city: z.string(),
    state: z.string().optional().default(""),
    postalCode: z.string().optional().default(""),
    country: z.string().optional().default("LK"),
    phone: z.string().optional(),
  }),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = shippingRatesSchema.parse(body);

    const productIds = parsed.cartItems.map((item) => item.id).filter(Boolean);

    // 1. Fetch branch assignments for products from branch_inventory table
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

    // 2. Resolve default branch for each vendor org as fallback
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

    // 3. Group items by (vendorOrgId + branchId)
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

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[POST /api/shipping/rates] Error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to calculate shipping rates" }, { status: 500 });
  }
}
