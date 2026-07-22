import * as schema from "@/shared/db/schema";
import { eq, sql, type SQL } from "drizzle-orm";

export type CustomerOwnedOrderRow = {
  customerUserId: string | null;
};

/** Order access is keyed solely on Clerk `customerUserId` (set at checkout). */
export function customerOwnsOrder(order: CustomerOwnedOrderRow, userId: string | null): boolean {
  return Boolean(userId && order.customerUserId === userId);
}

/** Drizzle WHERE fragment for listing customer-visible orders. */
export function buildCustomerOrderAccessWhere(userId: string | null): SQL {
  if (!userId) {
    return sql`false`;
  }

  return eq(schema.simulatedOrders.customerUserId, userId);
}
