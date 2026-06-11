export const SIMULATED_ORDER_STATUSES = [
  'pending',
  'pending_payment',
  'fulfilled',
  'cancelled',
] as const;

export type SimulatedOrderStatus = (typeof SIMULATED_ORDER_STATUSES)[number];

/** Orders that can still be fulfilled or cancelled by an admin */
export function isActiveSimulatedOrder(status: string): boolean {
  return status === 'pending' || status === 'pending_payment';
}

export function formatOrderStatusLabel(status: string): string {
  switch (status) {
    case 'pending_payment':
      return 'Pending Payment (COD)';
    case 'pending':
      return 'Pending';
    case 'fulfilled':
      return 'Fulfilled';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function matchesOrderStatusFilter(
  status: string,
  filter: 'all' | 'pending' | 'pending_payment' | 'fulfilled' | 'cancelled'
): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return status === 'pending' || status === 'pending_payment';
  return status === filter;
}
