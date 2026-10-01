"use client";

import { useEffect } from "react";
import type { OrgOnboardingStatus } from "@/features/organization/onboarding";
import {
  WizardStepIndicator,
  WizardStep1Profile,
  WizardStep2CurrencyTax,
  WizardStep3CheckoutOptions,
  WizardStep4Review,
  useOrgOnboardingWizard,
  type TaxClassOption,
} from "./wizard";

export type { TaxClassOption };

export interface OrgOnboardingWizardModalProps {
  status: OrgOnboardingStatus;
  orgName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  taxClasses?: TaxClassOption[];
}

export default function OrgOnboardingWizardModal({
  status,
  orgName,
  isOpen,
  onClose,
  onSuccess,
  taxClasses = [],
}: OrgOnboardingWizardModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const wizard = useOrgOnboardingWizard({ status, onClose, onSuccess });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <WizardStepIndicator
          orgName={orgName}
          currentProgressPercent={wizard.currentProgressPercent}
          currentStep={wizard.step}
          onSelectStep={wizard.setStep}
          onClose={onClose}
        />

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {wizard.step === 1 && (
            <WizardStep1Profile
              description={wizard.description}
              setDescription={wizard.setDescription}
              shippingAddress={wizard.shippingAddress}
              shippingAddressLine2={wizard.shippingAddressLine2}
              shippingCity={wizard.shippingCity}
              shippingState={wizard.shippingState}
              shippingPostalCode={wizard.shippingPostalCode}
              shippingCountry={wizard.shippingCountry}
              phone={wizard.phone}
              phone2={wizard.phone2}
              onAddressChange={wizard.handleAddressChange}
              stockAllocationMode={wizard.stockAllocationMode}
              setStockAllocationMode={wizard.setStockAllocationMode}
              bannerUrl={wizard.bannerUrl}
              setBannerUrl={wizard.setBannerUrl}
            />
          )}

          {wizard.step === 2 && (
            <WizardStep2CurrencyTax
              orgId={status.orgId}
              baseCurrency={wizard.baseCurrency}
              setBaseCurrency={wizard.setBaseCurrency}
              fxMarkupPercent={wizard.fxMarkupPercent}
              setFxMarkupPercent={wizard.setFxMarkupPercent}
              defaultTaxClassId={wizard.defaultTaxClassId}
              setDefaultTaxClassId={wizard.setDefaultTaxClassId}
              taxClasses={taxClasses}
              isPending={wizard.isPending}
              startTransition={wizard.startTransition}
            />
          )}

          {wizard.step === 3 && (
            <WizardStep3CheckoutOptions
              standardDelivery={wizard.standardDelivery}
              setStandardDelivery={wizard.setStandardDelivery}
              storePickup={wizard.storePickup}
              setStorePickup={wizard.setStorePickup}
              cashOnDelivery={wizard.cashOnDelivery}
              setCashOnDelivery={wizard.setCashOnDelivery}
              bankTransfer={wizard.bankTransfer}
              setBankTransfer={wizard.setBankTransfer}
              payAtStore={wizard.payAtStore}
              setPayAtStore={wizard.setPayAtStore}
              bankName={wizard.bankName}
              setBankName={wizard.setBankName}
              bankAccountName={wizard.bankAccountName}
              setBankAccountName={wizard.setBankAccountName}
              bankAccountNumber={wizard.bankAccountNumber}
              setBankAccountNumber={wizard.setBankAccountNumber}
              bankBranchCode={wizard.bankBranchCode}
              setBankBranchCode={wizard.setBankBranchCode}
              bankTransferInstructions={wizard.bankTransferInstructions}
              setBankTransferInstructions={wizard.setBankTransferInstructions}
            />
          )}

          {wizard.step === 4 && (
            <WizardStep4Review
              description={wizard.description}
              address={wizard.address}
              phone={wizard.phone}
              baseCurrency={wizard.baseCurrency}
              standardDelivery={wizard.standardDelivery}
              storePickup={wizard.storePickup}
              cashOnDelivery={wizard.cashOnDelivery}
              bankTransfer={wizard.bankTransfer}
              payAtStore={wizard.payAtStore}
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
          <button
            type="button"
            onClick={() => wizard.setStep((s) => Math.max(1, s - 1))}
            disabled={wizard.step === 1 || wizard.isPending}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            &larr; Back
          </button>

          {wizard.step < 4 ? (
            <button
              type="button"
              onClick={wizard.handleNext}
              disabled={wizard.isPending}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {wizard.isPending ? "Saving..." : "Save & Continue →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={wizard.handleFinish}
              disabled={wizard.isPending}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              {wizard.isPending ? "Finalizing..." : "Complete Setup & Launch 🚀"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
