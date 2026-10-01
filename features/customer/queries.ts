import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { buildCustomerOrderAccessWhere } from "@/features/orders/customer-ownership";
import { eq, inArray, desc, and, sql } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";

export async function getOrderById(id: string) {
  try {
    const [order] = await db
      .select({
        id: schema.simulatedOrders.id,
        customerName: schema.simulatedOrders.customerName,
        customerEmail: schema.simulatedOrders.customerEmail,
        customerUserId: schema.simulatedOrders.customerUserId,
        subtotalAmount: schema.simulatedOrders.subtotalAmount,
        taxAmount: schema.simulatedOrders.taxAmount,
        shippingAmount: schema.simulatedOrders.shippingAmount,
        totalAmount: schema.simulatedOrders.totalAmount,
        presentmentCurrency: schema.simulatedOrders.presentmentCurrency,
        vendorBaseCurrency: schema.simulatedOrders.vendorBaseCurrency,
        status: schema.simulatedOrders.status,
        fulfillmentMethod: schema.simulatedOrders.fulfillmentMethod,
        paymentMethod: schema.simulatedOrders.paymentMethod,
        pickupBranchId: schema.simulatedOrders.pickupBranchId,
        paymentSlipUrl: schema.simulatedOrders.paymentSlipUrl,
        paymentSlipUploadedAt: schema.simulatedOrders.paymentSlipUploadedAt,
        paymentVerifiedAt: schema.simulatedOrders.paymentVerifiedAt,
        paymentVerifiedBy: schema.simulatedOrders.paymentVerifiedBy,
        stockDepleted: schema.simulatedOrders.stockDepleted,
        shippingAddress: schema.simulatedOrders.shippingAddress,
        shippingAddressLine2: schema.simulatedOrders.shippingAddressLine2,
        shippingCity: schema.simulatedOrders.shippingCity,
        shippingState: schema.simulatedOrders.shippingState,
        shippingPostalCode: schema.simulatedOrders.shippingPostalCode,
        shippingCountry: schema.simulatedOrders.shippingCountry,
        shippingPhone: schema.simulatedOrders.shippingPhone,
        shippingPhone2: schema.simulatedOrders.shippingPhone2,
        createdAt: schema.simulatedOrders.createdAt,
        updatedAt: schema.simulatedOrders.updatedAt,
      })
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, id))
      .limit(1);

    return order ?? null;
  } catch (error) {
    logger.error("Failed to fetch order by ID", error, { orderId: id });
    return null;
  }
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

/**
 * Fetches the user's wishlist items with bounded pagination and descending date ordering.
 * Enforces a bounded limit (default 100, max 200) to protect against memory exhaustion.
 */
export async function getUserWishlist(userId: string | null, limit = 100, offset = 0) {
  if (!userId) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, 200));
  const safeOffset = Math.max(0, offset);

  try {
    return await db
      .select()
      .from(schema.wishlists)
      .where(eq(schema.wishlists.userId, userId))
      .orderBy(desc(schema.wishlists.createdAt))
      .limit(safeLimit)
      .offset(safeOffset);
  } catch (error) {
    logger.error("Failed to fetch user wishlist", error, { userId });
    return [];
  }
}

/**
 * Returns the total count of wishlist items for a user.
 */
export async function getUserWishlistCount(userId: string | null): Promise<number> {
  if (!userId) {
    return 0;
  }

  try {
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.wishlists)
      .where(eq(schema.wishlists.userId, userId));

    return countResult?.count ?? 0;
  } catch (error) {
    logger.error("Failed to count user wishlist", error, { userId });
    return 0;
  }
}

export async function getCustomerOrders(userId: string | null, limit = 50, offset = 0) {
  if (!userId) {
    return [];
  }

  try {
    return await db
      .select({
        id: schema.simulatedOrders.id,
        customerName: schema.simulatedOrders.customerName,
        customerEmail: schema.simulatedOrders.customerEmail,
        customerUserId: schema.simulatedOrders.customerUserId,
        subtotalAmount: schema.simulatedOrders.subtotalAmount,
        taxAmount: schema.simulatedOrders.taxAmount,
        shippingAmount: schema.simulatedOrders.shippingAmount,
        totalAmount: schema.simulatedOrders.totalAmount,
        presentmentCurrency: schema.simulatedOrders.presentmentCurrency,
        vendorBaseCurrency: schema.simulatedOrders.vendorBaseCurrency,
        status: schema.simulatedOrders.status,
        fulfillmentMethod: schema.simulatedOrders.fulfillmentMethod,
        paymentMethod: schema.simulatedOrders.paymentMethod,
        pickupBranchId: schema.simulatedOrders.pickupBranchId,
        paymentSlipUrl: schema.simulatedOrders.paymentSlipUrl,
        paymentSlipUploadedAt: schema.simulatedOrders.paymentSlipUploadedAt,
        paymentVerifiedAt: schema.simulatedOrders.paymentVerifiedAt,
        paymentVerifiedBy: schema.simulatedOrders.paymentVerifiedBy,
        stockDepleted: schema.simulatedOrders.stockDepleted,
        shippingAddress: schema.simulatedOrders.shippingAddress,
        shippingAddressLine2: schema.simulatedOrders.shippingAddressLine2,
        shippingCity: schema.simulatedOrders.shippingCity,
        shippingState: schema.simulatedOrders.shippingState,
        shippingPostalCode: schema.simulatedOrders.shippingPostalCode,
        shippingCountry: schema.simulatedOrders.shippingCountry,
        shippingPhone: schema.simulatedOrders.shippingPhone,
        shippingPhone2: schema.simulatedOrders.shippingPhone2,
        createdAt: schema.simulatedOrders.createdAt,
        updatedAt: schema.simulatedOrders.updatedAt,
      })
      .from(schema.simulatedOrders)
      .where(buildCustomerOrderAccessWhere(userId))
      .orderBy(desc(schema.simulatedOrders.createdAt))
      .limit(Math.min(limit, 100))
      .offset(offset);
  } catch (error) {
    logger.error("Failed to fetch orders for customer", error, { customerUserId: userId });
    return [];
  }
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

  const safeProductIds = productIds.slice(0, 200);

  try {
    return await db
      .select({
        product: schema.products,
        category: schema.categories,
      })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(and(inArray(schema.products.id, safeProductIds), eq(schema.products.status, "active")))
      .limit(safeProductIds.length);
  } catch (error) {
    logger.error("Failed to fetch wishlist products", error);
    return [];
  }
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
