'use client';

import Image from 'next/image';
import { isActiveSimulatedOrder } from '@/features/orders/status';
import {
  canFulfillCodOrder,
  canUploadPaymentSlip,
  canVerifyBankTransferPayment,
} from '@/features/orders/payment.rules';
import { isBankTransferPayment } from '@/features/billing/bank-transfer';
import PaymentSlipUpload from '@/features/orders/components/PaymentSlipUpload';

interface VendorOrderPaymentPanelProps {
  order: {
    id: string;
    paymentMethod: string;
    status: string;
    paymentSlipUrl?: string | null;
    paymentSlipPreviewUrl?: string | null;
    customerEmail: string;
  };
  onVerify: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  isPending: boolean;
}

export function VendorOrderPaymentPanel({
  order,
  onVerify,
  onReject,
  onCancel,
  isPending,
}: VendorOrderPaymentPanelProps) {
  if (!isActiveSimulatedOrder(order.status)) {
    return null;
  }

  const showSlip = Boolean(order.paymentSlipUrl);
  const verifyBank = canVerifyBankTransferPayment(order);
  const fulfillCod = canFulfillCodOrder(order);
  const awaitingSlip =
    isBankTransferPayment(order.paymentMethod) && order.status === 'pending_payment';

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-3 space-y-3">
      {showSlip && order.paymentSlipPreviewUrl && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Payment slip</p>
          <a
            href={order.paymentSlipPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative w-full max-w-[220px] aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
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

      {awaitingSlip && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Waiting for customer to upload a bank payment slip.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {verifyBank && (
          <>
            <button
              type="button"
              onClick={() => onVerify(order.id)}
              disabled={isPending}
              className="flex-1 min-w-[120px] py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Verify Payment
            </button>
            <button
              type="button"
              onClick={() => onReject(order.id)}
              disabled={isPending}
              className="flex-1 min-w-[120px] py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Reject Slip
            </button>
          </>
        )}
        {fulfillCod && (
          <button
            type="button"
            onClick={() => onVerify(order.id)}
            disabled={isPending}
            className="flex-1 min-w-[120px] py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Mark COD Fulfilled
          </button>
        )}
        <button
          type="button"
          onClick={() => onCancel(order.id)}
          disabled={isPending}
          className="flex-1 min-w-[120px] py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
        >
          Cancel Order
        </button>
      </div>
    </div>
  );
}

interface CustomerPaymentSlipSectionProps {
  order: {
    id: string;
    paymentMethod: string;
    status: string;
    paymentSlipUrl?: string | null;
    paymentSlipPreviewUrl?: string | null;
    customerEmail: string;
  };
}

export function CustomerPaymentSlipSection({ order }: CustomerPaymentSlipSectionProps) {
  if (!canUploadPaymentSlip(order)) {
    if (order.status === 'payment_submitted') {
      return (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Your payment slip was submitted and is awaiting vendor verification.
        </p>
      );
    }
    return null;
  }

  return (
    <PaymentSlipUpload
      orderId={order.id}
      customerEmail={order.customerEmail}
      existingSlipPreviewUrl={order.paymentSlipPreviewUrl}
    />
  );
}
