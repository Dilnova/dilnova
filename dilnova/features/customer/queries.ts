import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, inArray, desc, sql, or, and } from 'drizzle-orm';

export async function getOrderById(id: string) {
  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, id))
    .limit(1);

  return order ?? null;
}

export async function getOrderItems(orderId: string) {
  return db
    .select()
    .from(schema.simulatedOrderItems)
    .where(eq(schema.simulatedOrderItems.orderId, orderId));
}

export async function getPickupBranchName(branchId: string) {
  const rows = await db
    .select({ name: schema.branches.name })
    .from(schema.branches)
    .where(eq(schema.branches.id, branchId))
    .limit(1);

  return rows[0]?.name ?? null;
}

export async function getUserWishlist(userId: string) {
  return db
    .select()
    .from(schema.wishlists)
    .where(eq(schema.wishlists.userId, userId));
}

export async function getCustomerOrders(
  userId: string | null,
  normalizedUserEmail: string | null
) {
  if (!normalizedUserEmail) {
    return [];
  }

  return db
    .select()
    .from(schema.simulatedOrders)
    .where(
      userId
        ? or(
            eq(schema.simulatedOrders.customerUserId, userId),
            sql`lower(trim(${schema.simulatedOrders.customerEmail})) = ${normalizedUserEmail}`
          )
        : sql`lower(trim(${schema.simulatedOrders.customerEmail})) = ${normalizedUserEmail}`
    )
    .orderBy(desc(schema.simulatedOrders.createdAt));
}

export async function getPickupBranchNameByIdMap(pickupBranchIds: string[]) {
  const pickupBranchRows =
    pickupBranchIds.length > 0
      ? await db
          .select({ id: schema.branches.id, name: schema.branches.name })
          .from(schema.branches)
          .where(inArray(schema.branches.id, pickupBranchIds))
      : [];

  return new Map(pickupBranchRows.map((branch) => [branch.id, branch.name]));
}

export async function getWishlistProducts(productIds: string[]) {
  if (productIds.length === 0) {
    return [];
  }

  return db
    .select({
      product: schema.products,
      category: schema.categories,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(
      and(
        inArray(schema.products.id, productIds),
        eq(schema.products.status, 'active')
      )
    );
}

export async function getOrderItemsForOrders(orderIds: string[]) {
  if (orderIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(schema.simulatedOrderItems)
    .where(inArray(schema.simulatedOrderItems.orderId, orderIds));
}
