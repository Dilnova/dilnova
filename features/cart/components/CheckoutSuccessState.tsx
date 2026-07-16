'use client';

import Link from 'next/link';
import { BANK_TRANSFER_PAYMENT_ID, type BankTransferCheckoutInstructions } from '@/features/billing/bank-transfer';
import BankTransferInstructions from '@/features/billing/components/BankTransferInstructions';
import { CustomerPaymentSlipSection } from '@/features/orders/components/OrderPaymentPanels';

interface CheckoutSuccessStateProps {
  confirmedOrderId: string;
  confirmedOrderEmail: string;
  bankTransferInstructions: BankTransferCheckoutInstructions | null;
  confirmationEmailSent: boolean;
  remainingCartCount: number;
  onClose: () => void;
}

export function CheckoutSuccessState({
  confirmedOrderId,
  confirmedOrderEmail,
  bankTransferInstructions,
  confirmationEmailSent,
  remainingCartCount,
  onClose,
}: CheckoutSuccessStateProps) {
  const isBankTransferOrder = Boolean(bankTransferInstructions);

  return (
    <div className="flex items-center justify-center p-6 text-zinc-900 dark:text-zinc-50 font-sans">
      <div className="max-w-lg w-full border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 bg-white dark:bg-zinc-900 shadow-xl space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isBankTransferOrder ? 'Order Placed' : 'Order Confirmed!'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isBankTransferOrder ? (
              <>
                Your order has been received and is awaiting bank transfer payment.
                {confirmedOrderEmail && (
                  <>
                    {' '}
                    {confirmationEmailSent ? (
                      <>A confirmation with payment instructions was sent to <strong className="text-zinc-700 dark:text-zinc-200">{confirmedOrderEmail}</strong>.</>
                    ) : (
                      <>Use the details below to complete your transfer. Save this page or note your payment reference.</>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                Thank you for your order.
                {confirmedOrderEmail && (
                  <>
                    {' '}
                    {confirmationEmailSent ? (
                      <>A confirmation was sent to <strong className="text-zinc-700 dark:text-zinc-200">{confirmedOrderEmail}</strong>.</>
                    ) : (
                      <>Order updates will use <strong className="text-zinc-700 dark:text-zinc-200">{confirmedOrderEmail}</strong>.</>
                    )}
                  </>
                )}
              </>
            )}
          </p>
          {confirmedOrderId && (
            <p className="text-[11px] font-mono text-zinc-400">
              Order ID: {confirmedOrderId.slice(0, 8).toUpperCase()}
            </p>
          )}
          {remainingCartCount > 0 && (
            <p className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
              {remainingCartCount} item{remainingCartCount === 1 ? '' : 's'} from other vendors remain in your cart. Return to the cart to checkout the next vendor.
            </p>
          )}
        </div>

        {bankTransferInstructions && (
          <BankTransferInstructions instructions={bankTransferInstructions} compact />
        )}

        {isBankTransferOrder && confirmedOrderId && confirmedOrderEmail && (
          <CustomerPaymentSlipSection
            order={{
              id: confirmedOrderId,
              paymentMethod: BANK_TRANSFER_PAYMENT_ID,
              status: 'pending_payment',
              customerEmail: confirmedOrderEmail,
            }}
          />
        )}

        <div className="border-t border-zinc-100 dark:border-zinc-850 pt-6 space-y-3">
          {confirmedOrderId && (
            <Link
              href={`/customer/invoice/${confirmedOrderId}`}
              className="block w-full text-center py-3 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all hover:bg-purple-50 dark:hover:bg-purple-950/20"
            >
              View Invoice
            </Link>
          )}
          <button
            onClick={onClose}
            className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
          >
            {remainingCartCount > 0 ? 'Back to Cart' : 'Continue Shopping'}
          </button>
        </div>
      </div>
    </div>
  );
}
