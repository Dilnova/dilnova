import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createClerkClient } from '@clerk/nextjs/server';
import { unstable_cache } from 'next/cache';

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
  ['vendor-org-details-v1'],
  { tags: ['vendor-org-details'], revalidate: 300 }
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
