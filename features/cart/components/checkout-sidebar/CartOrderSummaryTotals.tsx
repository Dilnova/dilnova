"use client";

import type { CartTaxLineByClass } from "./types";

interface CartOrderSummaryTotalsProps {
  priceSyncNotice: string | null;
  taxLabel: string;
  taxLinesByClass: CartTaxLineByClass[];
  isSignedIn: boolean;
  checkoutItemCount: number;
  cartCount: number;
  vendorCount: number;
  selectedVendorSummary: { vendorName: string } | null;
  checkoutSubtotal: number;
  estimatedTax: number;
  shippingFee: number;
  grandTotal: number;
  formatPrice: (cents: number) => string;
  optionsLoading: boolean;
  requiresVendorSelection: boolean;
  requiresDeliveryAddress: boolean;
  addressConfirmed: boolean;
  shippingCountry: string;
  shippingCity: string;
  shippingAddress: string;
}

export function CartOrderSummaryTotals({
  priceSyncNotice,
  taxLabel,
  taxLinesByClass,
  isSignedIn,
  checkoutItemCount,
  cartCount,
  vendorCount,
  selectedVendorSummary,
  checkoutSubtotal,
  estimatedTax,
  shippingFee,
  grandTotal,
  formatPrice,
  optionsLoading,
  requiresVendorSelection,
  requiresDeliveryAddress,
  addressConfirmed,
  shippingCountry,
  shippingCity,
  shippingAddress,
}: CartOrderSummaryTotalsProps) {
  const displaySubtotal = checkoutSubtotal;

  return (
    <>
      <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
        Order Summary
      </h2>

      {priceSyncNotice && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          {priceSyncNotice}
        </p>
      )}

      <div className="space-y-3 text-xs font-mono">
        {isSignedIn &&
          checkoutItemCount > 0 &&
          checkoutItemCount < cartCount &&
          vendorCount <= 1 && (
            <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
              Checkout totals for {checkoutItemCount} {checkoutItemCount === 1 ? "item" : "items"}{" "}
              selected. Unticked items stay in your cart.
            </p>
          )}
        {vendorCount > 1 && selectedVendorSummary && (
          <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
            Checkout totals for {selectedVendorSummary.vendorName} ({checkoutItemCount}{" "}
            {checkoutItemCount === 1 ? "item" : "items"}). Other vendors stay in your cart.
          </p>
        )}

        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
          <span>Subtotal</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-200">
            {formatPrice(displaySubtotal)}
          </span>
        </div>

        {optionsLoading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-600 animate-pulse">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-28"></div>
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
            </div>
            <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-600 animate-pulse">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
            </div>
          </div>
        ) : (
          <>
            {taxLinesByClass && taxLinesByClass.length > 1 ? (
              <div className="space-y-1.5 py-1 border-y border-zinc-100 dark:border-zinc-900/60">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                  Tax Breakdown
                </span>
                {taxLinesByClass.map((tl) => (
                  <div
                    key={tl.code}
                    className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 pl-2 gap-2"
                  >
                    <span
                      className="truncate min-w-0 flex-1"
                      title={
                        tl.name.includes(`(${tl.ratePercent}%)`)
                          ? tl.name
                          : `${tl.name} (${tl.ratePercent}%)`
                      }
                    >
                      •{" "}
                      {tl.name.includes(`(${tl.ratePercent}%)`)
                        ? tl.name
                        : `${tl.name} (${tl.ratePercent}%)`}
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-300 shrink-0">
                      {formatPrice(tl.taxAmountCents)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 text-zinc-700 dark:text-zinc-300 font-bold border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  <span>Total Estimated Tax</span>
                  <span>{formatPrice(estimatedTax)}</span>
                </div>
              </div>
            ) : requiresVendorSelection ? (
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px] italic gap-2">
                <span className="truncate min-w-0 flex-1" title={taxLabel}>
                  {taxLabel}
                </span>
                <span className="font-mono text-zinc-400 shrink-0">Select a vendor</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 gap-2">
                <span className="truncate min-w-0 flex-1" title={taxLabel}>
                  {taxLabel}
                </span>
                <span className="font-bold text-zinc-900 dark:text-zinc-200 shrink-0">
                  {formatPrice(estimatedTax)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
              <span>Shipping</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-200">
                {requiresDeliveryAddress &&
                (!addressConfirmed || !shippingCountry.trim() || !shippingCity.trim()) ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400 text-[11px] font-sans">
                    Enter delivery address
                  </span>
                ) : shippingFee === 0 ? (
                  "FREE"
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 flex items-center justify-between text-zinc-900 dark:text-zinc-100 font-sans font-bold">
              <span>Total</span>
              <span className="text-lg font-black font-mono">
                {formatPrice(
                  requiresDeliveryAddress &&
                    (!addressConfirmed || !shippingAddress.trim() || !shippingCity.trim())
                    ? displaySubtotal + estimatedTax
                    : grandTotal,
                )}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
