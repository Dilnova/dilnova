import type { getCustomerOrders, getOrderItemsForOrders } from "@/features/customer/queries";
import type { getCustomerDashboardData } from "@/features/customer/services/customer-dashboard.service";
import type { getCustomerDeliveryDetailsService } from "@/features/cart/services/customer-delivery.service";
import type { getCheckoutOptionsCatalog } from "@/features/organization/checkout-options";
import type { CheckoutOptionDefinition } from "@/features/organization/checkout-options.shared";

export type CustomerRawOrder = Awaited<ReturnType<typeof getCustomerOrders>>[number];
export type CustomerOrderItemRow = Awaited<ReturnType<typeof getOrderItemsForOrders>>[number];

export type CustomerDashboardData = Awaited<ReturnType<typeof getCustomerDashboardData>>;
export type CustomerOrder = CustomerDashboardData["orders"][number];
export type CustomerOrderWithSlip = CustomerOrder;

export type CustomerDeliveryDetails = NonNullable<
  Awaited<ReturnType<typeof getCustomerDeliveryDetailsService>>
>;
export type CheckoutOptionsCatalog = Awaited<ReturnType<typeof getCheckoutOptionsCatalog>>;

export type { CheckoutOptionDefinition };
