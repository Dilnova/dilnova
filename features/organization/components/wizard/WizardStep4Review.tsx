"use client";

interface WizardStep4ReviewProps {
  description: string;
  address: string;
  phone: string;
  baseCurrency: string;
  standardDelivery: boolean;
  storePickup: boolean;
  cashOnDelivery: boolean;
  bankTransfer: boolean;
  payAtStore: boolean;
}

export default function WizardStep4Review({
  description,
  address,
  phone,
  baseCurrency,
  standardDelivery,
  storePickup,
  cashOnDelivery,
  bankTransfer,
  payAtStore,
}: WizardStep4ReviewProps) {
  const checkoutMethods = [
    standardDelivery && "Delivery",
    storePickup && "Pickup",
    cashOnDelivery && "COD",
    bankTransfer && "Bank",
    payAtStore && "Pay @ Store",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 text-emerald-900 dark:text-emerald-200">
        <h3 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
          <span>✅</span> Final Review & Launch
        </h3>
        <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
          Review your organization settings below before completing onboarding.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/30 font-mono text-xs">
        <div className="flex justify-between items-center py-1 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500">Store Description:</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[250px]">
            {description || "Not provided"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500">Business Address:</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[250px]">
            {address || "Not provided"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500">Support Phone:</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {phone || "Not provided"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500">Base Currency:</span>
          <span className="font-extrabold text-purple-600 dark:text-purple-400">
            {baseCurrency}
          </span>
        </div>

        <div className="flex justify-between items-center py-1">
          <span className="text-zinc-500">Checkout Options:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {checkoutMethods || "None selected"}
          </span>
        </div>
      </div>
    </div>
  );
}
