"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Spinner } from "@/shared/ui/loading";
import Link from "next/link";
import { useState } from "react";
import { CartOrderSummaryTotals } from "./checkout-sidebar/CartOrderSummaryTotals";
import { CartFulfillmentPaymentSection } from "./checkout-sidebar/CartFulfillmentPaymentSection";
import { CartSendToInboxCard } from "./checkout-sidebar/CartSendToInboxCard";
import type {
  SidebarFulfillmentOption,
  SidebarPaymentOption,
  CartTaxLineByClass,
  ShippingRateItem,
} from "./checkout-sidebar/types";

export type {
  SidebarFulfillmentOption,
  SidebarPaymentOption,
  CartTaxLineByClass,
  ShippingRateItem,
};

interface CartCheckoutSidebarProps {
  priceSyncNotice: string | null;
  taxLabel?: string;
  taxLinesByClass?: CartTaxLineByClass[];
  isSignedIn: boolean;
  checkoutItemCount: number;
  cartCount: number;
  vendorCount: number;
  selectedVendorSummary: { vendorName: string } | null;
  checkoutSubtotal: number;
  cartTotal: number;
  estimatedTax: number;
  shippingFee: number;
  grandTotal: number;
  formatPrice: (cents: number) => string;
  authRedirectUrl: string | null;
  user:
    | {
        fullName?: string | null;
        firstName?: string | null;
        primaryEmailAddress?: { emailAddress: string } | null;
      }
    | null
    | undefined;
  optionsLoading: boolean;
  requiresVendorSelection: boolean;
  selectedCheckoutProductIds: string[];
  checkoutOptions: { fulfillment: SidebarFulfillmentOption[]; payment: SidebarPaymentOption[] };
  fulfillmentMethod: string;
  handleFulfillmentChange: (optionId: string) => void;
  selectedFulfillment: SidebarFulfillmentOption | null | undefined;
  pickupBranches: { id: string; name: string; address: string | null; phone?: string | null }[];
  pickupBranchId: string;
  setPickupBranchId: (id: string) => void;
  requiresDeliveryAddress: boolean;
  shippingAddress: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone: string;
  shippingPhone2: string;
  handleAddressChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  compatiblePayments: SidebarPaymentOption[];
  paymentMethod: string;
  setPaymentMethod: (id: string) => void;
  bankTransferSelected: boolean;
  bankTransferMissingDetails: boolean;
  checkoutErrors: string[];
  handleCheckout: (optionsLoading: boolean) => void;
  checkoutStatus: string;
  cartItems: unknown[];
  clearCart: () => void;
  handleSendInbox: (e: React.FormEvent) => void;
  emailStatus: string;
  availableShippingRates?: ShippingRateItem[];
  selectedRateId?: string;
  onSelectShippingRate?: (rateId: string) => void;
  addressConfirmed?: boolean;
  isFetchingRates?: boolean;
}

export function CartCheckoutSidebar({
  priceSyncNotice,
  taxLabel = "Estimated Tax",
  taxLinesByClass = [],
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
  authRedirectUrl,
  user,
  optionsLoading,
  requiresVendorSelection,
  selectedCheckoutProductIds,
  checkoutOptions,
  fulfillmentMethod,
  handleFulfillmentChange,
  selectedFulfillment,
  pickupBranches,
  pickupBranchId,
  setPickupBranchId,
  requiresDeliveryAddress,
  shippingAddress,
  shippingAddressLine2,
  shippingCity,
  shippingState,
  shippingPostalCode,
  shippingCountry,
  shippingPhone,
  shippingPhone2,
  handleAddressChange,
  compatiblePayments,
  paymentMethod,
  setPaymentMethod,
  bankTransferSelected,
  bankTransferMissingDetails,
  checkoutErrors,
  handleCheckout,
  checkoutStatus,
  cartItems,
  clearCart,
  handleSendInbox,
  emailStatus,
  availableShippingRates = [],
  selectedRateId,
  onSelectShippingRate,
  addressConfirmed = false,
  isFetchingRates = false,
}: CartCheckoutSidebarProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <>
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm space-y-6">
        <CartOrderSummaryTotals
          priceSyncNotice={priceSyncNotice}
          taxLabel={taxLabel}
          taxLinesByClass={taxLinesByClass}
          isSignedIn={isSignedIn}
          checkoutItemCount={checkoutItemCount}
          cartCount={cartCount}
          vendorCount={vendorCount}
          selectedVendorSummary={selectedVendorSummary}
          checkoutSubtotal={checkoutSubtotal}
          estimatedTax={estimatedTax}
          shippingFee={shippingFee}
          grandTotal={grandTotal}
          formatPrice={formatPrice}
          optionsLoading={optionsLoading}
          requiresVendorSelection={requiresVendorSelection}
          requiresDeliveryAddress={requiresDeliveryAddress}
          addressConfirmed={addressConfirmed}
          shippingCountry={shippingCountry}
          shippingCity={shippingCity}
          shippingAddress={shippingAddress}
        />

        {/* Sign-in required or signed-in checkout details */}
        {!isSignedIn ? (
          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
            <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/80 dark:bg-purple-950/20 p-4 space-y-3 text-center">
              <span className="text-2xl block">🔒</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Sign in to checkout
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                An account is required to place orders, track status, upload payment slips, and view
                invoices.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-1">
                <SignInButton mode="modal" forceRedirectUrl={authRedirectUrl ?? "/cart"}>
                  <button
                    type="button"
                    className="w-full sm:w-auto px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl={authRedirectUrl ?? "/cart"}>
                  <button
                    type="button"
                    className="w-full sm:w-auto px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Create Account
                  </button>
                </SignUpButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 space-y-1">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
              Checkout as
            </h3>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {user?.fullName || user?.firstName || "Customer"}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        )}

        {/* Fulfillment & Payment Options — signed-in only */}
        {isSignedIn && cartItems.length > 0 && (
          <CartFulfillmentPaymentSection
            optionsLoading={optionsLoading}
            requiresVendorSelection={requiresVendorSelection}
            selectedCheckoutProductIds={selectedCheckoutProductIds}
            vendorCount={vendorCount}
            checkoutOptions={checkoutOptions}
            fulfillmentMethod={fulfillmentMethod}
            handleFulfillmentChange={handleFulfillmentChange}
            selectedFulfillment={selectedFulfillment}
            pickupBranches={pickupBranches}
            pickupBranchId={pickupBranchId}
            setPickupBranchId={setPickupBranchId}
            requiresDeliveryAddress={requiresDeliveryAddress}
            shippingAddress={shippingAddress}
            shippingAddressLine2={shippingAddressLine2}
            shippingCity={shippingCity}
            shippingState={shippingState}
            shippingPostalCode={shippingPostalCode}
            shippingCountry={shippingCountry}
            shippingPhone={shippingPhone}
            shippingPhone2={shippingPhone2}
            handleAddressChange={handleAddressChange}
            isFetchingRates={isFetchingRates}
            availableShippingRates={availableShippingRates}
            selectedRateId={selectedRateId}
            onSelectShippingRate={onSelectShippingRate}
            formatPrice={formatPrice}
            compatiblePayments={compatiblePayments}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            bankTransferSelected={bankTransferSelected}
            bankTransferMissingDetails={bankTransferMissingDetails}
            selectedVendorSummary={selectedVendorSummary}
          />
        )}

        <div className="pt-2 space-y-3">
          {isSignedIn && checkoutErrors.length > 0 && !optionsLoading && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                Please complete to checkout:
              </p>
              <ul className="list-disc list-inside text-[11px] font-medium text-red-600 dark:text-red-400/80 space-y-1">
                {checkoutErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {!isSignedIn ? (
            <SignInButton mode="modal" forceRedirectUrl={authRedirectUrl ?? "/cart"}>
              <button
                type="button"
                className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-purple-900/10 transition-all cursor-pointer"
              >
                Sign In to Checkout
              </button>
            </SignInButton>
          ) : (
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 shrink-0 rounded border-zinc-300 text-purple-600 focus:ring-purple-600"
                />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/refund"
                    target="_blank"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Refund Policy
                  </Link>
                  .
                </span>
              </label>

              <button
                onClick={() => handleCheckout(optionsLoading)}
                disabled={
                  checkoutStatus.startsWith("processing") ||
                  checkoutStatus.includes("Retrying") ||
                  optionsLoading ||
                  cartItems.length === 0 ||
                  checkoutErrors.length > 0 ||
                  !agreedToTerms
                }
                className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 disabled:cursor-not-allowed text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-purple-900/10 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {checkoutStatus.startsWith("processing") || checkoutStatus.includes("Retrying") ? (
                  <>
                    <Spinner size="sm" />
                    <span>
                      {checkoutStatus === "processing" ? "Processing..." : checkoutStatus}
                    </span>
                  </>
                ) : (
                  <span>
                    {vendorCount > 1 && selectedVendorSummary
                      ? `Checkout ${selectedVendorSummary.vendorName}`
                      : "Proceed to Checkout"}
                  </span>
                )}
              </button>
            </div>
          )}

          <button
            onClick={clearCart}
            className="w-full text-center py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Clear Cart
          </button>
        </div>
      </div>

      <CartSendToInboxCard
        isSignedIn={isSignedIn}
        authRedirectUrl={authRedirectUrl}
        handleSendInbox={handleSendInbox}
        emailStatus={emailStatus}
        cartCount={cartCount}
        userEmail={user?.primaryEmailAddress?.emailAddress}
      />
    </>
  );
}
