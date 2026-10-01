"use client";

import DeliveryAddressFormFields from "@/features/customer/components/DeliveryAddressFormFields";
import { CartLiveShippingRates } from "./CartLiveShippingRates";
import type { SidebarFulfillmentOption, SidebarPaymentOption, ShippingRateItem } from "./types";

interface CartFulfillmentPaymentSectionProps {
  optionsLoading: boolean;
  requiresVendorSelection: boolean;
  selectedCheckoutProductIds: string[];
  vendorCount: number;
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
  isFetchingRates: boolean;
  availableShippingRates: ShippingRateItem[];
  selectedRateId?: string;
  onSelectShippingRate?: (rateId: string) => void;
  formatPrice: (cents: number) => string;
  compatiblePayments: SidebarPaymentOption[];
  paymentMethod: string;
  setPaymentMethod: (id: string) => void;
  bankTransferSelected: boolean;
  bankTransferMissingDetails: boolean;
  selectedVendorSummary: { vendorName: string } | null;
}

export function CartFulfillmentPaymentSection({
  optionsLoading,
  requiresVendorSelection,
  selectedCheckoutProductIds,
  vendorCount,
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
  isFetchingRates,
  availableShippingRates,
  selectedRateId,
  onSelectShippingRate,
  formatPrice,
  compatiblePayments,
  paymentMethod,
  setPaymentMethod,
  bankTransferSelected,
  bankTransferMissingDetails,
  selectedVendorSummary,
}: CartFulfillmentPaymentSectionProps) {
  return (
    <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">
        Delivery & Payment
      </h3>

      {optionsLoading ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Loading checkout options...</p>
      ) : (
        <>
          {requiresVendorSelection && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Select a vendor on the left and tick products to load delivery and payment options.
            </p>
          )}
          {selectedCheckoutProductIds.length === 0 && !requiresVendorSelection && (
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
            <>
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

              <CartLiveShippingRates
                isFetchingRates={isFetchingRates}
                shippingCity={shippingCity}
                shippingCountry={shippingCountry}
                availableShippingRates={availableShippingRates}
                selectedRateId={selectedRateId}
                onSelectShippingRate={onSelectShippingRate}
                formatPrice={formatPrice}
              />
            </>
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
                  Bank account details and your payment reference will be shown after you place the
                  order (confirmation screen, email, and invoice).
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
