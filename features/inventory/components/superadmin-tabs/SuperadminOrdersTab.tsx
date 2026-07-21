'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/notifications';
import { SimulatedOrder } from '../inventory.types';
import {
  isActiveSimulatedOrder,
  formatOrderStatusLabel,
  matchesOrderStatusFilter,
} from '@/features/orders/status';
import { describeOrderCheckout, type CheckoutOptionDefinition } from '@/features/organization/checkout-options.shared';
import { getOrderDisplayTotals } from '@/features/billing/checkout-totals';
import { updateSimulatedOrderStatusAction } from '@/features/inventory/superadmin.actions';

interface SuperadminOrdersTabProps {
  simulatedOrders: SimulatedOrder[];
  checkoutOptionsCatalog: CheckoutOptionDefinition[];
}

export default function SuperadminOrdersTab({ simulatedOrders, checkoutOptionsCatalog }: SuperadminOrdersTabProps) {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  // ── Order Filter ──
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    'all' | 'pending' | 'pending_payment' | 'payment_submitted' | 'fulfilled' | 'cancelled'
  >('all');

  const filteredOrders = simulatedOrders.filter((o) =>
    matchesOrderStatusFilter(o.status, orderStatusFilter)
  );

  const handleUpdateOrderStatus = async (orderId: string, status: 'pending' | 'fulfilled' | 'cancelled') => {
    if (status === 'cancelled') {
      const confirmed = await confirmAction({
        title: 'Cancel Order',
        message: 'Cancel this order? Stock will be restored.',
        confirmText: 'Cancel Order',
        variant: 'danger'
      });
      if (!confirmed) return;
    }
    
    startTransition(async () => {
      try {
        await updateSimulatedOrderStatusAction(orderId, status);
        toast.success(`Order status updated to "${status}".`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update order.');
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Simulated Orders</h2>
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          {(['all', 'pending', 'pending_payment', 'payment_submitted', 'fulfilled', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setOrderStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                orderStatusFilter === f
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {f === 'all'
                ? 'All'
                : f === 'pending_payment'
                  ? 'Awaiting Pay'
                  : f === 'payment_submitted'
                    ? 'Slip Review'
                    : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl dark:border-zinc-800">
          <div className="text-5xl mb-4">🛒</div>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm font-semibold">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const checkoutDetails = describeOrderCheckout(order, checkoutOptionsCatalog);
            return (
              <div key={order.id} className="bg-white border border-zinc-200 rounded-xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{order.customerEmail}</p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                        {checkoutDetails.fulfillment}
                      </span>
                      <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
                        {checkoutDetails.payment}
                      </span>
                      {checkoutDetails.pickup && (
                        <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                          Pickup: {checkoutDetails.pickup}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">${(getOrderDisplayTotals(order).grandTotal / 100).toFixed(2)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      order.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                      order.status === 'cancelled' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                      order.status === 'payment_submitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                      order.status === 'pending_payment' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      {formatOrderStatusLabel(order.status).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Order items */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1 text-xs">
                      <span className="text-zinc-600 dark:text-zinc-300">{item.productName} × {item.quantity}</span>
                      <span className="font-mono text-zinc-500">${(item.unitPrice * item.quantity / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {order.paymentSlipPreviewUrl && (
                  <div className="mb-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Payment slip</p>
                    <a
                      href={order.paymentSlipPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block w-full max-w-[220px] aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                    >
                      <Image
                        src={order.paymentSlipPreviewUrl}
                        alt="Customer payment slip"
                        fill
                        className="object-contain"
                        sizes="220px"
                        unoptimized
                      />
                    </a>
                  </div>
                )}

                {/* Status actions */}
                {isActiveSimulatedOrder(order.status) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'fulfilled')}
                      disabled={isPending}
                      className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✓ Fulfill
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                      disabled={isPending}
                      className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
