import Link from 'next/link';
import { getOrderDisplayTotals } from '@/features/billing/checkout-totals';
import { describeOrderCheckout } from '@/features/organization/checkout-options.shared';
import { formatOrderStatusLabel } from '@/features/orders/status';
import { CustomerPaymentSlipSection } from '@/features/orders/components/OrderPaymentPanels';
import { isBankTransferPayment } from '@/features/billing/bank-transfer';
import OrderBankTransferInstructions from '@/features/customer/components/OrderBankTransferInstructions';

interface CustomerOrdersTabProps {
  orders: any[];
  itemsByOrderId: Record<string, any[]>;
  pickupBranchNameById: Map<string, string>;
  checkoutOptionsCatalog: any;
}

export default function CustomerOrdersTab({
  orders,
  itemsByOrderId,
  pickupBranchNameById,
  checkoutOptionsCatalog,
}: CustomerOrdersTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Order & Transaction History</h3>
        <p className="text-xs text-zinc-500 font-medium">View details and print invoices from your past storefront transactions.</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-950 p-8 shadow-sm max-w-md mx-auto">
          <span className="text-5xl">📋</span>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-4">No Transactions Yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
            When you purchase products or settle checkout invoices at vendor registers, your billing history will display here.
          </p>
          <Link
            href="/products"
            className="inline-block mt-5 text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-900/10 cursor-pointer"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const checkoutDetails = describeOrderCheckout(
              {
                ...order,
                pickupBranchName: order.pickupBranchId
                  ? pickupBranchNameById.get(order.pickupBranchId) ?? null
                  : null,
              },
              checkoutOptionsCatalog
            );
            const formattedOrderTotal = (getOrderDisplayTotals(order).grandTotal / 100).toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            });
            const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const items = itemsByOrderId[order.id] || [];
            const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

            let statusColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';
            if (order.status === 'fulfilled') {
              statusColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
            } else if (order.status === 'cancelled') {
              statusColor = 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400';
            } else if (order.status === 'payment_submitted') {
              statusColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
            } else if (order.status === 'pending_payment') {
              statusColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400';
            }

            return (
              <details
                key={order.id}
                className="group border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded-2xl overflow-hidden shadow-sm hover:border-purple-500/20 dark:hover:border-purple-500/25 transition-all [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 cursor-pointer select-none list-none outline-none">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-lg flex-shrink-0 text-purple-600 dark:text-purple-400 border border-purple-500/10">
                      📦
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}>
                          {formatOrderStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-405 font-medium">{orderDate}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
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
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-900">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-50 font-mono mt-0.5">{formattedOrderTotal}</p>
                    </div>
                    <div className="text-zinc-400 group-open:rotate-180 transition-transform duration-200 pr-1 text-[10px] font-bold">
                      ▼
                    </div>
                  </div>
                </summary>

                <div className="border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 space-y-4">
                  {/* Items List */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 font-mono">Line Items</h4>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 overflow-hidden">
                      {items.map((item: any) => {
                        const formattedUnitPrice = (item.unitPrice / 100).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        });
                        const formattedItemTotal = ((item.unitPrice * item.quantity) / 100).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        });
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3.5 text-xs text-zinc-800 dark:text-zinc-200">
                            <div className="space-y-0.5 min-w-0 pr-4">
                              <Link
                                href={`/products/${item.productId}`}
                                className="font-bold hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate block"
                              >
                                {item.productName}
                              </Link>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                Qty: {item.quantity} × {formattedUnitPrice}
                              </p>
                            </div>
                            <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-right flex-shrink-0">
                              {formattedItemTotal}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(order.shippingAddress || order.shippingCity || order.shippingPhone) && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3.5 space-y-1">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 font-mono">Delivery Details</h4>
                      {(order.shippingAddress || order.shippingCity) && (
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                          {[
                            order.shippingAddress,
                            order.shippingAddressLine2,
                            order.shippingCity ? `${order.shippingCity}, ${order.shippingState || ''} ${order.shippingPostalCode || ''}`.trim() : null,
                            order.shippingCountry
                          ].filter(Boolean).join('\n')}
                        </p>
                      )}
                      {order.shippingPhone && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{order.shippingPhone}</p>
                      )}
                      {order.shippingPhone2 && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{order.shippingPhone2}</p>
                      )}
                    </div>
                  )}

                  {isBankTransferPayment(order.paymentMethod) &&
                    (order.status === 'pending_payment' || order.status === 'payment_submitted') && (
                      <>
                        <OrderBankTransferInstructions order={order} items={items} />
                        <CustomerPaymentSlipSection
                        order={{
                          id: order.id,
                          paymentMethod: order.paymentMethod,
                          status: order.status,
                          paymentSlipUrl: order.paymentSlipUrl,
                          paymentSlipPreviewUrl: order.paymentSlipPreviewUrl,
                          customerEmail: order.customerEmail,
                        }}
                      />
                      </>
                    )}

                  {/* Invoice Print Link */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Customer Email: {order.customerEmail}
                    </div>
                    <Link
                      href={`/customer/invoice/${order.id}`}
                      className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold tracking-wide transition-all border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                    >
                      🖨️ View & Print Invoice
                    </Link>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
