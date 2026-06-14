import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { and, eq, ne, or, sql } from 'drizzle-orm';

export async function hasCustomerPurchasedProduct(
  productId: string,
  userId: string,
  normalizedEmail: string | null
): Promise<boolean> {
  if (!normalizedEmail) {
    const [purchaseByUserId] = await db
      .select({ id: schema.simulatedOrderItems.id })
      .from(schema.simulatedOrderItems)
      .innerJoin(
        schema.simulatedOrders,
        eq(schema.simulatedOrderItems.orderId, schema.simulatedOrders.id)
      )
      .where(
        and(
          eq(schema.simulatedOrderItems.productId, productId),
          eq(schema.simulatedOrders.customerUserId, userId),
          ne(schema.simulatedOrders.status, 'cancelled')
        )
      )
      .limit(1);

    return Boolean(purchaseByUserId);
  }

  const [purchase] = await db
    .select({ id: schema.simulatedOrderItems.id })
    .from(schema.simulatedOrderItems)
    .innerJoin(
      schema.simulatedOrders,
      eq(schema.simulatedOrderItems.orderId, schema.simulatedOrders.id)
    )
    .where(
      and(
        eq(schema.simulatedOrderItems.productId, productId),
        or(
          eq(schema.simulatedOrders.customerUserId, userId),
          sql`lower(trim(${schema.simulatedOrders.customerEmail})) = ${normalizedEmail}`
        ),
        ne(schema.simulatedOrders.status, 'cancelled')
      )
    )
    .limit(1);

  return Boolean(purchase);
}

export async function getVerifiedReviewerIdsForProduct(
  productId: string
): Promise<Set<string>> {
  const rows = await db
    .select({ userId: schema.simulatedOrders.customerUserId })
    .from(schema.simulatedOrderItems)
    .innerJoin(
      schema.simulatedOrders,
      eq(schema.simulatedOrderItems.orderId, schema.simulatedOrders.id)
    )
    .where(
      and(
        eq(schema.simulatedOrderItems.productId, productId),
        ne(schema.simulatedOrders.status, 'cancelled')
      )
    );

  return new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id)));
}
