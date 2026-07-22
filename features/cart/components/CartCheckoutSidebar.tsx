"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Spinner } from "@/shared/ui/loading";
import DeliveryAddressFormFields from "@/features/customer/components/DeliveryAddressFormFields";
import Link from "next/link";
import { useState } from "react";

export interface SidebarFulfillmentOption {
  id: string;
  label: string;
  description?: string;
  zeroShipping: boolean;
  requiresBranch: boolean;
}

export interface SidebarPaymentOption {
  id: string;
  label: string;
  description?: string;
  requiresDelivery: boolean;
  pendingPayment?: boolean;
}

interface CartCheckoutSidebarProps {
  priceSyncNotice: string | null;
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
  handleAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
}

export function CartCheckoutSidebar({
  priceSyncNotice,
  isSignedIn,
  checkoutItemCount,
  cartCount,
  vendorCount,
  selectedVendorSummary,
  checkoutSubtotal,
  cartTotal,
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
}: CartCheckoutSidebarProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <>
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm space-y-6">
        <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
          Order Summary
        </h2>

        {priceSyncNotice && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {priceSyncNotice}
          </p>
        )}

        <div className="space-y-3 text-xs font-mono">
          {isSignedIn && checkoutItemCount > 0 && checkoutItemCount < cartCount && (
            <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
              Checkout totals for {checkoutItemCount} ticked{" "}
              {checkoutItemCount === 1 ? "item" : "items"}
              {vendorCount > 1 && selectedVendorSummary
                ? ` from ${selectedVendorSummary.vendorName}`
                : ""}
              . Unticked items stay in your cart.
            </p>
          )}
          {vendorCount > 1 && selectedVendorSummary && checkoutItemCount === cartCount && (
            <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
              Checkout totals for {selectedVendorSummary.vendorName} ({checkoutItemCount}{" "}
              {checkoutItemCount === 1 ? "item" : "items"}). Other vendors stay in your cart.
            </p>
          )}

          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
            <span>Subtotal</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-200">
              {formatPrice(vendorCount > 1 ? checkoutSubtotal : cartTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
            <span>Estimated Tax (8%)</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-200">
              {formatPrice(estimatedTax)}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
            <span>Shipping</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-200">
              {shippingFee === 0 ? "FREE" : formatPrice(shippingFee)}
            </span>
          </div>

          {shippingFee > 0 && (
            <p className="text-[10px] text-purple-600 dark:text-purple-400 block text-right mt-1">
              Add {formatPrice(5000 - (vendorCount > 1 ? checkoutSubtotal : cartTotal))} more for
              free shipping!
            </p>
          )}

          <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 flex items-center justify-between text-zinc-900 dark:text-zinc-100 font-sans font-bold">
            <span>Total</span>
            <span className="text-lg font-black font-mono">{formatPrice(grandTotal)}</span>
          </div>
        </div>

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
          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
              Delivery & Payment
            </h3>

            {optionsLoading ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Loading checkout options...
              </p>
            ) : (
              <>
                {requiresVendorSelection && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Select a vendor on the left and tick products to load delivery and payment
                    options.
                  </p>
                )}
                {isSignedIn &&
                  selectedCheckoutProductIds.length === 0 &&
                  !requiresVendorSelection && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Tick at least one product on the left to checkout.
                    </p>
                  )}

                {checkoutOptions.fulfillment.length > 0 ? (
                  <fieldset className="space-y-2">
                    <legend className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
                      Fulfillment
                    </legend>
                    {checkoutOptions.fulfillment.map((option: SidebarFulfillmentOption) => (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          fulfillmentMethod === option.id
                            ? "border-purple-500/50 bg-purple-500/5"
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="fulfillment"
                          value={option.id}
                          checked={fulfillmentMethod === option.id}
                          onChange={() => handleFulfillmentChange(option.id)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {option.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {vendorCount > 1
                      ? requiresVendorSelection
                        ? "Select a vendor on the left to see available fulfillment methods."
                        : "No fulfillment methods are enabled for the selected vendor. Contact the store or try another vendor."
                      : "No fulfillment methods are enabled for this vendor. Contact the store or try again later."}
                  </p>
                )}

                {selectedFulfillment?.requiresBranch && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Pickup Branch
                    </p>
                    {pickupBranches.length > 0 ? (
                      <select
                        value={pickupBranchId}
                        onChange={(e) => setPickupBranchId(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                      >
                        {pickupBranches.length !== 1 && <option value="">Select a branch</option>}
                        {pickupBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                            {branch.address ? ` — ${branch.address}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Store pickup is enabled but no branches are configured for this vendor.
                      </p>
                    )}
                  </div>
                )}

                {requiresDeliveryAddress && (
                  <DeliveryAddressFormFields
                    shippingAddress={shippingAddress}
                    shippingAddressLine2={shippingAddressLine2}
                    shippingCity={shippingCity}
                    shippingState={shippingState}
                    shippingPostalCode={shippingPostalCode}
                    shippingCountry={shippingCountry}
                    shippingPhone={shippingPhone}
                    shippingPhone2={shippingPhone2}
                    onChange={handleAddressChange}
                  />
                )}

                {compatiblePayments.length > 0 ? (
                  <fieldset className="space-y-2">
                    <legend className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
                      Payment
                    </legend>
                    {compatiblePayments.map((option: SidebarPaymentOption) => (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          paymentMethod === option.id
                            ? "border-purple-500/50 bg-purple-500/5"
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={option.id}
                          checked={paymentMethod === option.id}
                          onChange={() => setPaymentMethod(option.id)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {option.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {checkoutOptions.payment.length > 0 && selectedFulfillment?.requiresBranch
                      ? "No payment methods are available for store pickup with the current selection. Choose home delivery or another fulfillment option."
                      : vendorCount > 1
                        ? requiresVendorSelection
                          ? "Select a vendor on the left to see available payment methods."
                          : "No payment methods are enabled for the selected vendor."
                        : "No payment methods are enabled for this vendor. Contact the store or try again later."}
                  </p>
                )}

                {bankTransferSelected && (
                  <div className="space-y-2">
                    {bankTransferMissingDetails ? (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Bank transfer cannot be completed until{" "}
                        {selectedVendorSummary?.vendorName || "this vendor"} configures bank account
                        details.
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Bank account details and your payment reference will be shown after you
                        place the order (confirmation screen, email, and invoice).
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
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
                  checkoutStatus === "processing" ||
                  optionsLoading ||
                  cartItems.length === 0 ||
                  checkoutErrors.length > 0 ||
                  !agreedToTerms
                }
                className="w-full text-center py-3 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 disabled:cursor-not-allowed text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-purple-900/10 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {checkoutStatus === "processing" ? (
                  <>
                    <Spinner size="sm" />
                    <span>Processing...</span>
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

      {/* Send to Inbox Box */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 dark:bg-zinc-950 dark:border-zinc-900 shadow-sm space-y-4">
        <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
          Send Cart to Inbox
        </h2>

        {!isSignedIn ? (
          <div className="space-y-3">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sign in to email a summary of your cart items to your account address.
            </p>
            <SignInButton mode="modal" forceRedirectUrl={authRedirectUrl ?? "/cart"}>
              <button
                type="button"
                className="w-full text-center py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Sign In to Email Summary
              </button>
            </SignInButton>
          </div>
        ) : (
          <form onSubmit={handleSendInbox} className="space-y-3">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Email the list of these {cartCount} items to your registered address.
            </p>

            <div className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900 truncate">
              📧 {user?.primaryEmailAddress?.emailAddress}
            </div>

            <button
              type="submit"
              disabled={emailStatus === "sending"}
              className="w-full text-center py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900/60 disabled:cursor-not-allowed text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {emailStatus === "sending" ? (
                <>
                  <Spinner size="sm" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Email Summary</span>
              )}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
