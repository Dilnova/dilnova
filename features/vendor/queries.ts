import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, sql } from "drizzle-orm";
import { createClerkClient } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

export const getCachedOrganization = unstable_cache(
  async (orgId: string) => {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      imageUrl: org.imageUrl,
      publicMetadata: org.publicMetadata,
    };
  },
  ["vendor-org-details-v1"],
  { tags: ["vendor-org-details"], revalidate: 300 },
);

export async function getBranchCountForOrg(orgId: string) {
  return db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.branches)
    .where(eq(schema.branches.orgId, orgId))
    .then((rows) => rows[0]?.count ?? 0);
}

export async function getOnlineOrderCountForVendor(orgId: string) {
  return db
    .select({ count: sql<number>`count(distinct ${schema.simulatedOrderItems.orderId})::int` })
    .from(schema.simulatedOrderItems)
    .where(eq(schema.simulatedOrderItems.vendorOrgId, orgId))
    .then((rows) => rows[0]?.count ?? 0);
}

export async function getVendorCatalogAndStockStats(orgId: string) {
  const [row] = await db
    .select({
      totalItems: sql<number>`cast(count(*) as int)`,
      totalProducts: sql<number>`cast(count(case when ${schema.products.type} = 'product' then 1 end) as int)`,
      totalServices: sql<number>`cast(count(case when ${schema.products.type} = 'service' then 1 end) as int)`,
      activeListings: sql<number>`cast(count(case when ${schema.products.status} != 'archived' then 1 end) as int)`,
      outOfStockCount: sql<number>`cast(count(case when ${schema.products.type} = 'product' and coalesce(${schema.inventory.quantity}, 0) = 0 then 1 end) as int)`,
      lowStockCount: sql<number>`cast(count(case when ${schema.products.type} = 'product' and coalesce(${schema.inventory.quantity}, 0) > 0 and coalesce(${schema.inventory.quantity}, 0) <= coalesce(${schema.inventory.lowStockThreshold}, 5) then 1 end) as int)`,
    })
    .from(schema.products)
    .leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.productId))
    .where(eq(schema.products.orgId, orgId));

  return {
    totalItems: row?.totalItems ?? 0,
    totalProducts: row?.totalProducts ?? 0,
    totalServices: row?.totalServices ?? 0,
    activeListings: row?.activeListings ?? 0,
    outOfStockCount: row?.outOfStockCount ?? 0,
    lowStockCount: row?.lowStockCount ?? 0,
  };
}
