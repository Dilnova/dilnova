"use client";

import { useState, useTransition } from "react";
import {
  cancelVendorOrderAction,
  rejectPaymentSlipAction,
  verifyOrderPaymentAction,
} from "@/features/orders/vendor.actions";
import { formatOrderStatusLabel, matchesOrderStatusFilter } from "@/features/orders/status";
import { describeOrderCheckout } from "@/features/organization/checkout-options.shared";
import { getOrderDisplayTotals } from "@/features/billing/checkout-totals";
import { VendorOrderPaymentPanel } from "@/features/orders/components/OrderPaymentPanels";

interface VendorSimulatedOrdersTabProps {
  data: any; // Will be properly typed during TS cleanup
  refreshData: () => void;
  triggerNotification: (success: boolean, text: string) => void;
}

export default function VendorSimulatedOrdersTab({
  data,
  refreshData,
  triggerNotification,
}: VendorSimulatedOrdersTabProps) {
  const [isPending, startTransition] = useTransition();

  const [orderStatusFilter, setOrderStatusFilter] = useState<
    "all" | "pending" | "pending_payment" | "payment_submitted" | "fulfilled" | "cancelled"
  >("all");

  const filteredOrders = data.simulatedOrders.filter((o: any) =>
    matchesOrderStatusFilter(o.status, orderStatusFilter),
  );

  const handleVerifyOrderPayment = (orderId: string) => {
    startTransition(async () => {
      try {
        const result = await verifyOrderPaymentAction({ orderId });
        if (result?.data?.success) {
          triggerNotification(true, "Order payment verified.");
          refreshData();
        } else {
          throw new Error(result?.serverError || "Verification failed.");
        }
      } catch (error) {
        triggerNotification(false, error instanceof Error ? error.message : "Verification failed.");
      }
    });
  };

  const handleRejectPaymentSlip = (orderId: string) => {
    startTransition(async () => {
      try {
        const result = await rejectPaymentSlipAction({ orderId });
        if (result?.data?.success) {
          triggerNotification(true, "Payment slip rejected. Customer can upload again.");
          refreshData();
        } else {
          throw new Error(result?.serverError || "Rejection failed.");
        }
      } catch (error) {
        triggerNotification(false, error instanceof Error ? error.message : "Rejection failed.");
      }
    });
  };

  const handleCancelVendorOrder = (orderId: string) => {
    startTransition(async () => {
      try {
        const result = await cancelVendorOrderAction({ orderId });
        if (result?.data?.success) {
          triggerNotification(true, "Order cancelled.");
          refreshData();
        } else {
          throw new Error(result?.serverError || "Cancellation failed.");
        }
      } catch (error) {
        triggerNotification(false, error instanceof Error ? error.message : "Cancellation failed.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">
          Customer Orders (Simulated)
        </h3>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl flex-wrap">
          {(
            [
              "all",
              "pending",
              "pending_payment",
              "payment_submitted",
              "fulfilled",
              "cancelled",
            ] as const
          ).map((f) => (
            <button
              key={f}
              onClick={() => setOrderStatusFilter(f)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                orderStatusFilter === f
                  ? "bg-white shadow-sm font-black dark:bg-zinc-800"
                  : "text-zinc-500"
              }`}
            >
              {f === "pending_payment"
                ? "Awaiting Pay"
                : f === "payment_submitted"
                  ? "Slip Review"
                  : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredOrders.map((o: any) => {
          const checkoutDetails = describeOrderCheckout(o, data.checkoutOptionsCatalog);
          return (
            <div
              key={o.id}
              className="bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row justify-between gap-4"
            >
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {o.customerName} ({o.customerEmail})
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Order Date: {new Date(o.createdAt).toLocaleString()}
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
                <div className="mt-2 pl-2 border-l-2 border-zinc-200 space-y-1">
                  {o.items.map((item: any) => (
                    <p key={item.id} className="text-xs text-zinc-600 dark:text-zinc-400">
                      • {item.productName} (x{item.quantity}) — ${(item.unitPrice / 100).toFixed(2)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="text-right flex flex-col justify-between items-end">
                <div>
                  <span className="text-sm font-mono font-black text-zinc-900 dark:text-zinc-100">
                    ${(getOrderDisplayTotals(o).grandTotal / 100).toFixed(2)}
                  </span>
                  <p
                    className={`text-[10px] uppercase font-bold mt-1 ${
                      o.status === "fulfilled"
                        ? "text-emerald-600"
                        : o.status === "cancelled"
                          ? "text-rose-600"
                          : o.status === "payment_submitted"
                            ? "text-blue-600"
                            : o.status === "pending_payment"
                              ? "text-orange-600"
                              : "text-amber-600"
                    }`}
                  >
                    {formatOrderStatusLabel(o.status)}
                  </p>
                </div>
                <VendorOrderPaymentPanel
                  order={{
                    id: o.id,
                    paymentMethod: o.paymentMethod,
                    status: o.status,
                    paymentSlipUrl: o.paymentSlipUrl,
                    paymentSlipPreviewUrl: o.paymentSlipPreviewUrl,
                    customerEmail: o.customerEmail,
                  }}
                  onVerify={() => handleVerifyOrderPayment(o.id)}
                  onReject={() => handleRejectPaymentSlip(o.id)}
                  onCancel={() => handleCancelVendorOrder(o.id)}
                  isPending={isPending}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
