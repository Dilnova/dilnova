"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateOrgDefaultTaxAction } from "@/features/organization/org-currency.actions";
import { CURRENCY_OPTIONS, type TaxClassOption } from "./types";

interface WizardStep2CurrencyTaxProps {
  orgId: string;
  baseCurrency: string;
  setBaseCurrency: (val: string) => void;
  fxMarkupPercent: number;
  setFxMarkupPercent: (val: number) => void;
  defaultTaxClassId: string;
  setDefaultTaxClassId: (val: string) => void;
  taxClasses?: TaxClassOption[];
  isPending: boolean;
  startTransition: (callback: () => void | Promise<void>) => void;
}

export default function WizardStep2CurrencyTax({
  orgId,
  baseCurrency,
  setBaseCurrency,
  fxMarkupPercent,
  setFxMarkupPercent,
  defaultTaxClassId,
  setDefaultTaxClassId,
  taxClasses = [],
  isPending,
  startTransition,
}: WizardStep2CurrencyTaxProps) {
  const [isAddingCustomTax, setIsAddingCustomTax] = useState(false);
  const [customTaxName, setCustomTaxName] = useState<string>("");
  const [customTaxRate, setCustomTaxRate] = useState<string>("");

  const handleCreateWizardCustomTax = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRate = parseFloat(customTaxRate);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      toast.error("Please enter a valid tax percentage between 0 and 100.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateOrgDefaultTaxAction({
          organizationId: orgId,
          customTaxName: customTaxName.trim() || undefined,
          customTaxRatePercent: parsedRate,
        });

        if (res?.data?.success) {
          toast.success(`Custom Tax "${customTaxName || `Custom Tax (${parsedRate}%)`}" created!`);
          setCustomTaxName("");
          setCustomTaxRate("");
          setIsAddingCustomTax(false);
        } else {
          toast.error(res?.serverError || "Failed to create custom tax rate.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An error occurred.");
      }
    });
  };

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-3 text-indigo-900 dark:text-indigo-200">
        <p className="font-semibold text-xs">Step 2: Financial & Base Currency</p>
        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
          Set the primary currency for product prices, catalog listings, and order totals.
        </p>
      </div>

      <div>
        <label
          htmlFor="modal-base-currency"
          className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1"
        >
          Primary Base Currency <span className="text-red-500">*</span>
        </label>
        <select
          id="modal-base-currency"
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs sm:text-sm font-semibold"
        >
          {CURRENCY_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="modal-fx-markup"
          className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1"
        >
          Multi-Currency FX Markup (%)
        </label>
        <input
          id="modal-fx-markup"
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={fxMarkupPercent}
          onChange={(e) => setFxMarkupPercent(parseFloat(e.target.value) || 0)}
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs sm:text-sm font-mono"
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Default Store Tax Setting (Level 3 Fallback)
          </label>
          <select
            id="modal-default-tax"
            value={defaultTaxClassId}
            onChange={(e) => setDefaultTaxClassId(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs sm:text-sm font-semibold"
          >
            <option value="">No Store Default (Default 0% Tax)</option>
            {taxClasses.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.name} ({tc.ratePercent}%) {tc.orgId ? "⭐️ (Store Custom)" : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Products with no product or category tax override will inherit this store default.
          </p>
        </div>

        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                ➕ Add New Store Custom Tax Rate
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Create a custom tax rate for your store. Once created, it will appear in the default
                tax dropdown above.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingCustomTax(!isAddingCustomTax)}
              className="px-3 py-1.5 text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-all cursor-pointer"
            >
              {isAddingCustomTax ? "Cancel" : "✏️ Create Tax Rate"}
            </button>
          </div>

          {isAddingCustomTax && (
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Tax Name / Label
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={customTaxName}
                  onChange={(e) => setCustomTaxName(e.target.value)}
                  placeholder="e.g. Provincial Retail Tax"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Tax Rate Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={customTaxRate}
                    onChange={(e) => setCustomTaxRate(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 font-bold">
                    %
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCreateWizardCustomTax}
                  disabled={isPending}
                  className="w-full sm:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save New Tax Rate"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
