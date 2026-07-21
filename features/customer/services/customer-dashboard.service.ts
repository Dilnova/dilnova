import { clerkClient } from '@clerk/nextjs/server';
import { getCachedOrganizations, getCachedUserRole, getCachedIsSuperAdmin } from '@/shared/auth/clerk-cache';
import {
  getCustomerOrders,
  getOrderItemsForOrders,
  getPickupBranchNameByIdMap,
  getUserWishlist,
  getWishlistProducts,
} from '@/features/customer/queries';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { getCustomerDeliveryDetailsAction } from '@/features/cart/checkout.actions';
import { attachPaymentSlipPreviews } from '@/features/orders/payment-slip-preview';
import { getOrderDisplayTotals } from '@/features/billing/checkout-totals';

export async function getCustomerDashboardData(userId: string) {
  const client = await clerkClient();
  const [
    userWishlist,
    organizations,
    rawOrders,
    checkoutOptionsCatalog,
    userRole,
    isSuperAdmin,
    deliveryDetails
  ] = await Promise.all([
    getUserWishlist(userId),
    getCachedOrganizations(client).catch(() => []),
    getCustomerOrders(userId),
    getCheckoutOptionsCatalog(),
    getCachedUserRole(userId),
    getCachedIsSuperAdmin(userId),
    getCustomerDeliveryDetailsAction({}).then(res => res?.data || null),
  ]);

  const orders = await attachPaymentSlipPreviews(rawOrders);

  const pickupBranchIds = [
    ...new Set(orders.map((order) => order.pickupBranchId).filter((id): id is string => Boolean(id))),
  ];
  const pickupBranchNameById = await getPickupBranchNameByIdMap(pickupBranchIds);

  const wishlistItems = userWishlist.length > 0
    ? await getWishlistProducts(userWishlist.map((w) => w.productId))
    : [];

  const orderIds = orders.map((o) => o.id);
  const orderItems = await getOrderItemsForOrders(orderIds);

  // Group items by orderId
  const itemsByOrderId = orderItems.reduce((acc, item) => {
    if (!acc[item.orderId]) {
      acc[item.orderId] = [];
    }
    acc[item.orderId].push(item);
    return acc;
  }, {} as Record<string, typeof orderItems>);

  // Calculate stats
  const totalSpent = orders.reduce((sum, order) => {
    if (order.status !== 'cancelled') {
      return sum + getOrderDisplayTotals(order).grandTotal;
    }
    return sum;
  }, 0);

  return {
    wishlistItems,
    organizations,
    orders,
    checkoutOptionsCatalog,
    userRole,
    isSuperAdmin,
    deliveryDetails,
    pickupBranchNameById,
    itemsByOrderId,
    totalSpent,
  };
}

export type CustomerDashboardData = Awaited<ReturnType<typeof getCustomerDashboardData>>;
