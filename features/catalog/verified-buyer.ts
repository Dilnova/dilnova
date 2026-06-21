import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { buildCustomerOrderAccessWhere } from '@/features/orders/customer-ownership';
import { and, eq, ne } from 'drizzle-orm';

export async function hasCustomerPurchasedProduct(
  productId: string,
  userId: string
): Promise<boolean> {
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
        buildCustomerOrderAccessWhere(userId),
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
