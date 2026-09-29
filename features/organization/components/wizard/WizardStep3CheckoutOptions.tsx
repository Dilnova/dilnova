"use client";

interface WizardStep3CheckoutOptionsProps {
  standardDelivery: boolean;
  setStandardDelivery: (val: boolean) => void;
  storePickup: boolean;
  setStorePickup: (val: boolean) => void;
  cashOnDelivery: boolean;
  setCashOnDelivery: (val: boolean) => void;
  bankTransfer: boolean;
  setBankTransfer: (val: boolean) => void;
  payAtStore: boolean;
  setPayAtStore: (val: boolean) => void;
  bankName: string;
  setBankName: (val: string) => void;
  bankAccountName: string;
  setBankAccountName: (val: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (val: string) => void;
  bankBranchCode: string;
  setBankBranchCode: (val: string) => void;
  bankTransferInstructions: string;
  setBankTransferInstructions: (val: string) => void;
}

export default function WizardStep3CheckoutOptions({
  standardDelivery,
  setStandardDelivery,
  storePickup,
  setStorePickup,
  cashOnDelivery,
  setCashOnDelivery,
  bankTransfer,
  setBankTransfer,
  payAtStore,
  setPayAtStore,
  bankName,
  setBankName,
  bankAccountName,
  setBankAccountName,
  bankAccountNumber,
  setBankAccountNumber,
  bankBranchCode,
  setBankBranchCode,
  bankTransferInstructions,
  setBankTransferInstructions,
}: WizardStep3CheckoutOptionsProps) {
  return (
    <div className="space-y-4 text-xs sm:text-sm">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-amber-900 dark:text-amber-200">
        <p className="font-semibold text-xs">Step 3: Checkout Payment & Fulfillment Methods</p>
        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
          Select available payment and delivery options for customer checkouts.
        </p>
      </div>

      <div>
        <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Fulfillment Methods</p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
            <input
              type="checkbox"
              checked={standardDelivery}
              onChange={(e) => setStandardDelivery(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Home Delivery</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Ship items to customer delivery addresses
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
            <input
              type="checkbox"
              checked={storePickup}
              onChange={(e) => setStorePickup(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Store Pickup</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Allow customers to collect orders from a branch store
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Payment Methods</p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
            <input
              type="checkbox"
              checked={cashOnDelivery}
              onChange={(e) => setCashOnDelivery(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Cash on Delivery (COD)
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Pay cash upon delivery</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
            <input
              type="checkbox"
              checked={payAtStore}
              onChange={(e) => setPayAtStore(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Pay at Store</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Pay in person when picking up items
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
            <input
              type="checkbox"
              checked={bankTransfer}
              onChange={(e) => setBankTransfer(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Bank Transfer</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Direct transfer to vendor bank account
              </p>
            </div>
          </label>
        </div>
      </div>

      {bankTransfer && (
        <div className="p-4 border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl space-y-3">
          <p className="font-bold text-xs text-purple-900 dark:text-purple-200">
            Bank Account Details for Transfer
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="modal-bank-name" className="block font-semibold mb-1">
                Bank Name *
              </label>
              <input
                id="modal-bank-name"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Commercial Bank"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label htmlFor="modal-account-name" className="block font-semibold mb-1">
                Account Holder Name *
              </label>
              <input
                id="modal-account-name"
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="e.g. Acme PLC"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="modal-account-number" className="block font-semibold mb-1">
                Account Number *
              </label>
              <input
                id="modal-account-number"
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="1234567890"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label htmlFor="modal-branch-code" className="block font-semibold mb-1">
                Branch Code / Name
              </label>
              <input
                id="modal-branch-code"
                type="text"
                value={bankBranchCode}
                onChange={(e) => setBankBranchCode(e.target.value)}
                placeholder="e.g. 001 - Main Branch"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="modal-bank-instructions" className="block font-semibold mb-1 text-xs">
              Payment Instructions / Notes
            </label>
            <textarea
              id="modal-bank-instructions"
              rows={2}
              value={bankTransferInstructions}
              onChange={(e) => setBankTransferInstructions(e.target.value)}
              placeholder="e.g. Please upload payment receipt slip after transfer."
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
