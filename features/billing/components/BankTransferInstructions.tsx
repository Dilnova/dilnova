import type { BankTransferCheckoutInstructions } from "@/features/billing/bank-transfer";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

interface BankTransferInstructionsProps {
  instructions: BankTransferCheckoutInstructions;
  compact?: boolean;
}

export default function BankTransferInstructions({
  instructions,
  compact = false,
}: BankTransferInstructionsProps) {
  const { reference, grandTotalCents, vendors } = instructions;

  return (
    <div
      className={`text-left rounded-xl border border-amber-500/30 bg-amber-500/5 ${
        compact ? "p-4 space-y-3" : "p-5 space-y-4"
      }`}
    >
      <div>
        <h3
          className={`font-bold text-amber-800 dark:text-amber-300 ${compact ? "text-xs" : "text-sm"}`}
        >
          Bank Transfer Instructions
        </h3>
        <p
          className={`text-zinc-600 dark:text-zinc-400 mt-1 ${compact ? "text-[11px]" : "text-xs"}`}
        >
          Transfer the total amount using the reference below. Your order will be processed after
          payment is verified. Collect your items at the selected pickup branch once payment is
          confirmed.
        </p>
      </div>

      <div className={`grid gap-2 font-mono ${compact ? "text-[11px]" : "text-xs"}`}>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Payment reference</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{reference}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Amount to transfer</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {formatPrice(grandTotalCents)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {vendors.map((vendor) => (
          <div
            key={vendor.orgId}
            className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-3 space-y-2"
          >
            <div className="flex justify-between gap-3 text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {vendor.vendorName}
              </span>
              {vendors.length > 1 && (
                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  {formatPrice(vendor.amountCents)}
                </span>
              )}
            </div>

            {vendor.bankDetails ? (
              <dl
                className={`grid gap-1 font-mono text-zinc-600 dark:text-zinc-400 ${compact ? "text-[10px]" : "text-[11px]"}`}
              >
                <div className="flex justify-between gap-3">
                  <dt>Bank</dt>
                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                    {vendor.bankDetails.bankName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Account name</dt>
                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                    {vendor.bankDetails.accountName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Account number</dt>
                  <dd className="font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                    {vendor.bankDetails.accountNumber}
                  </dd>
                </div>
                {vendor.bankDetails.branchCode && (
                  <div className="flex justify-between gap-3">
                    <dt>Branch / sort code</dt>
                    <dd className="font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                      {vendor.bankDetails.branchCode}
                    </dd>
                  </div>
                )}
                {vendor.bankDetails.instructions && (
                  <p className="pt-1 text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {vendor.bankDetails.instructions}
                  </p>
                )}
              </dl>
            ) : (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Bank details are not configured for this vendor. Contact the store for payment
                instructions.
              </p>
            )}
          </div>
        ))}
      </div>

      <p className={`text-zinc-500 dark:text-zinc-400 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        Include the payment reference{" "}
        <strong className="text-zinc-700 dark:text-zinc-300">{reference}</strong> in your transfer
        description so we can match your payment.
      </p>
    </div>
  );
}
