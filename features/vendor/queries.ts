import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, sql } from 'drizzle-orm';

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
