"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { updateVendorMetadata, completeOrgOnboarding } from "@/features/vendor/actions";
import {
  updateOrgCurrencyAction,
  updateOrgDefaultTaxAction,
} from "@/features/organization/org-currency.actions";
import { updateOrgCheckoutOptionsAction } from "@/features/organization/checkout-options.actions";
import { uploadToCloudinary } from "@/shared/media/cloudinary-upload";
import SafeProgressBar from "@/shared/ui/SafeProgressBar";
import type { OrgOnboardingStatus } from "@/features/organization/onboarding";
import DeliveryAddressFormFields from "@/features/customer/components/DeliveryAddressFormFields";

const CURRENCY_OPTIONS = [
  { code: "LKR", label: "LKR - Sri Lankan Rupee" },
  { code: "USD", label: "USD - United States Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British Pound" },
  { code: "AUD", label: "AUD - Australian Dollar" },
  { code: "CAD", label: "CAD - Canadian Dollar" },
  { code: "SGD", label: "SGD - Singapore Dollar" },
  { code: "INR", label: "INR - Indian Rupee" },
  { code: "AED", label: "AED - UAE Dirham" },
];

export interface TaxClassOption {
  id: string;
  name: string;
  code: string;
  ratePercent: number;
  orgId?: string | null;
}

interface OrgOnboardingWizardModalProps {
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
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [isPending, startTransition] = useTransition();

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

  // Form Fields - Step 1
  const [description, setDescription] = useState(status.initialValues.description || "");
  const [shippingAddress, setShippingAddress] = useState(status.initialValues.address || "");
  const [shippingAddressLine2, setShippingAddressLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [phone, setPhone] = useState(status.initialValues.phone || "");
  const [phone2, setPhone2] = useState("");
  const [bannerUrl, setBannerUrl] = useState(status.initialValues.bannerUrl || "");
  const [stockAllocationMode, setStockAllocationMode] = useState<
    "target_branch" | "central_intake"
  >(status.initialValues.stockAllocationMode || "central_intake");

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "shippingAddress") setShippingAddress(value);
    else if (name === "shippingAddressLine2") setShippingAddressLine2(value);
    else if (name === "shippingCity") setShippingCity(value);
    else if (name === "shippingState") setShippingState(value);
    else if (name === "shippingPostalCode") setShippingPostalCode(value);
    else if (name === "shippingCountry") setShippingCountry(value);
    else if (name === "shippingPhone") setPhone(value);
    else if (name === "shippingPhone2") setPhone2(value);
  };

  const address = [
    shippingAddress,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountry,
  ]
    .filter(Boolean)
    .join(", ");

  // Form Fields - Step 2
  const [baseCurrency, setBaseCurrency] = useState(status.initialValues.baseCurrency || "LKR");
  const [fxMarkupPercent, setFxMarkupPercent] = useState<number>(0);
  const [defaultTaxClassId, setDefaultTaxClassId] = useState<string>("");
  const [isAddingCustomTax, setIsAddingCustomTax] = useState(false);
  const [customTaxName, setCustomTaxName] = useState<string>("");
  const [customTaxRate, setCustomTaxRate] = useState<string>("");

  // Form Fields - Step 3 (Checkout Options)
  const initialOptions = status.initialValues.checkoutOptions || {};
  const [standardDelivery, setStandardDelivery] = useState<boolean>(
    initialOptions.standard_delivery ?? true,
  );
  const [storePickup, setStorePickup] = useState<boolean>(initialOptions.store_pickup ?? true);
  const [cashOnDelivery, setCashOnDelivery] = useState<boolean>(
    initialOptions.cash_on_delivery ?? true,
  );
  const [bankTransfer, setBankTransfer] = useState<boolean>(initialOptions.bank_transfer ?? false);
  const [payAtStore, setPayAtStore] = useState<boolean>(initialOptions.pay_at_store ?? true);

  // Bank Transfer fields
  const [bankName, setBankName] = useState<string>("");
  const [bankAccountName, setBankAccountName] = useState<string>("");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [bankBranchCode, setBankBranchCode] = useState<string>("");
  const [bankTransferInstructions, setBankTransferInstructions] = useState<string>("");

  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Banner image exceeds 10MB limit.");
      return;
    }

    setIsBannerUploading(true);
    setBannerUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, {
        uploadKind: "vendor-profile",
        onProgress: (progress) => {
          setBannerUploadProgress(progress.percent);
        },
      });

      if (result.success && result.publicUrl) {
        setBannerUrl(result.publicUrl);
        toast.success("Banner image uploaded successfully!");
      } else {
        toast.error(result.error || "Banner upload failed.");
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error("An error occurred during banner upload.");
    } finally {
      setIsBannerUploading(false);
      setBannerUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveStep1 = async () => {
    if (!description.trim()) {
      toast.error("Store Description is mandatory.");
      return false;
    }

    const fullAddress = [
      shippingAddress,
      shippingAddressLine2,
      shippingCity,
      shippingState,
      shippingPostalCode,
      shippingCountry,
    ]
      .filter(Boolean)
      .join(", ");

    if (!fullAddress.trim()) {
      toast.error("Business Address is mandatory.");
      return false;
    }
    if (!phone.trim()) {
      toast.error("Support Phone Number is mandatory.");
      return false;
    }
    if (!bannerUrl.trim()) {
      toast.error("Store Banner / Logo is mandatory.");
      return false;
    }

    try {
      await updateVendorMetadata(status.orgId, {
        description: description.trim(),
        address: fullAddress.trim(),
        phone: phone.trim(),
        bannerUrl: bannerUrl.trim(),
        stockAllocationMode,
      });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile details.");
      return false;
    }
  };

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
          organizationId: status.orgId,
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

  const handleSaveStep2 = async () => {
    if (!baseCurrency || baseCurrency.length !== 3) {
      toast.error("Valid 3-letter Base Currency is required.");
      return false;
    }

    try {
      const res = await updateOrgCurrencyAction({
        organizationId: status.orgId,
        baseCurrency,
        fxMarkupPercent,
        defaultTaxClassId: defaultTaxClassId || null,
      });

      if (res?.validationErrors) {
        toast.error("Invalid currency selection.");
        return false;
      }
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save base currency & tax settings.",
      );
      return false;
    }
  };

  const handleSaveStep3 = async () => {
    if (!standardDelivery && !storePickup) {
      toast.error("Please select at least one fulfillment method.");
      return false;
    }
    if (!cashOnDelivery && !bankTransfer && !payAtStore) {
      toast.error("Please select at least one payment method.");
      return false;
    }

    if (
      bankTransfer &&
      (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim())
    ) {
      toast.error("Please fill in Bank Name, Account Name, and Account Number for Bank Transfer.");
      return false;
    }

    try {
      if (bankTransfer) {
        await updateVendorMetadata(status.orgId, {
          description,
          address,
          phone,
          bannerUrl,
          bankName: bankName.trim(),
          bankAccountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankBranchCode: bankBranchCode.trim(),
          bankTransferInstructions: bankTransferInstructions.trim(),
        });
      }

      const checkoutOptions: Record<string, boolean> = {
        standard_delivery: standardDelivery,
        store_pickup: storePickup,
        cash_on_delivery: cashOnDelivery,
        bank_transfer: bankTransfer,
        pay_at_store: payAtStore,
      };

      const res = await updateOrgCheckoutOptionsAction({
        organizationId: status.orgId,
        checkoutOptions,
      });

      if (res?.validationErrors || res?.serverError) {
        toast.error(res.serverError || "Failed to save checkout options.");
        return false;
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save checkout options.");
      return false;
    }
  };

  const handleNext = () => {
    startTransition(async () => {
      if (step === 1) {
        const ok = await handleSaveStep1();
        if (ok) {
          toast.success("Step 1 complete: Store Details saved.");
          router.refresh();
          setStep(2);
        }
      } else if (step === 2) {
        const ok = await handleSaveStep2();
        if (ok) {
          toast.success("Step 2 complete: Base Currency configured.");
          router.refresh();
          setStep(3);
        }
      } else if (step === 3) {
        const ok = await handleSaveStep3();
        if (ok) {
          toast.success("Step 3 complete: Checkout Methods saved.");
          router.refresh();
          setStep(4);
        }
      }
    });
  };

  const handleFinish = () => {
    startTransition(async () => {
      const ok1 = await handleSaveStep1();
      const ok2 = await handleSaveStep2();
      const ok3 = await handleSaveStep3();
      if (ok1 && ok2 && ok3) {
        try {
          await completeOrgOnboarding(status.orgId);
          toast.success("🎉 Organization onboarding completed successfully!");
          router.refresh();
          if (onSuccess) onSuccess();
          onClose();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to complete onboarding.");
        }
      }
    });
  };

  const hasFulfillment = standardDelivery || storePickup;
  const hasPayment = cashOnDelivery || bankTransfer || payAtStore;

  const filledCount = [
    description,
    address,
    phone,
    bannerUrl,
    baseCurrency,
    hasFulfillment && hasPayment ? "ok" : "",
  ].filter((val) => val && val.trim().length > 0).length;

  const currentProgressPercent = Math.round((filledCount / 6) * 100);

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
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 px-6 py-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 rounded-full h-8 w-8 flex items-center justify-center text-base font-bold transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
              {orgName || "Organization"} Setup Wizard
            </span>
          </div>
          <h2 id="onboarding-modal-title" className="text-2xl font-black tracking-tight">
            Complete Mandatory Details
          </h2>
          <p className="text-xs text-purple-200 mt-1 max-w-lg">
            Configure your store profile, currency, and checkout options for customers.
          </p>

          {/* Stepper Progress Bar */}
          <div className="mt-4 pt-3 border-t border-purple-800/60 flex items-center gap-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-purple-950/80 border border-purple-700/50">
              <SafeProgressBar
                percent={currentProgressPercent}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300 rounded-full"
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-300 shrink-0">
              {currentProgressPercent}% Done
            </span>
          </div>
        </div>

        {/* Step Tabs Header */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                step === 1
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px]">
                1
              </span>
              <span>Profile</span>
            </button>

            <span className="text-zinc-300 dark:text-zinc-700">&rarr;</span>

            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                step === 2
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px]">
                2
              </span>
              <span>Currency</span>
            </button>

            <span className="text-zinc-300 dark:text-zinc-700">&rarr;</span>

            <button
              type="button"
              onClick={() => setStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                step === 3
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px]">
                3
              </span>
              <span>Checkout Options</span>
            </button>

            <span className="text-zinc-300 dark:text-zinc-700">&rarr;</span>

            <button
              type="button"
              onClick={() => setStep(4)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                step === 4
                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px]">
                4
              </span>
              <span>Final Review</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3 text-purple-900 dark:text-purple-200">
                <p className="font-semibold text-xs">Step 1: Public Store Profile</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                  These details will appear on your public storefront so customers can discover and
                  trust your business.
                </p>
              </div>

              <div>
                <label
                  htmlFor="modal-description"
                  className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1"
                >
                  Store Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="modal-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell your customers about your store, products, and value proposition..."
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs sm:text-sm"
                />
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
                <DeliveryAddressFormFields
                  shippingAddress={shippingAddress}
                  shippingAddressLine2={shippingAddressLine2}
                  shippingCity={shippingCity}
                  shippingState={shippingState}
                  shippingPostalCode={shippingPostalCode}
                  shippingCountry={shippingCountry}
                  shippingPhone={phone}
                  shippingPhone2={phone2}
                  onChange={handleAddressChange}
                />
              </div>

              <div>
                <label
                  htmlFor="modal-stock-mode"
                  className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1"
                >
                  Inventory Stock Allocation Mode
                </label>
                <select
                  id="modal-stock-mode"
                  value={stockAllocationMode}
                  onChange={(e) =>
                    setStockAllocationMode(e.target.value as "target_branch" | "central_intake")
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs sm:text-sm font-semibold"
                >
                  <option value="central_intake">Central Intake (Default Warehouse)</option>
                  <option value="target_branch">Target Branch (Direct Branch Distribution)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Store Banner / Logo <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />

                {bannerUrl ? (
                  <div className="space-y-2">
                    <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                      <Image
                        src={bannerUrl}
                        alt="Store Banner Preview"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2.5">
                        <span className="text-[10px] text-white font-mono bg-zinc-900/60 px-2 py-0.5 rounded">
                          Banner Preview
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBannerUploading}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:hover:bg-purple-900/30 dark:text-purple-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isBannerUploading ? "Uploading..." : "Replace Image"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerUrl("")}
                        disabled={isBannerUploading}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBannerUploading}
                    className="w-full flex flex-col items-center justify-center gap-2 py-6 px-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/70 transition-all cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                      {isBannerUploading ? (
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {isBannerUploading
                          ? "Uploading Image..."
                          : "Click to Upload Store Banner / Logo"}
                      </span>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        PNG, JPG, or WEBP up to 10MB
                      </p>
                    </div>
                  </button>
                )}

                {bannerUploadProgress !== null && (
                  <div className="mt-2">
                    <SafeProgressBar
                      percent={bannerUploadProgress}
                      className="h-1.5 bg-purple-600 rounded-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
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
                    Products with no product or category tax override will inherit this store
                    default.
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                        ➕ Add New Store Custom Tax Rate
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Create a custom tax rate for your store. Once created, it will appear in the
                        default tax dropdown above.
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
          )}

          {step === 3 && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-amber-900 dark:text-amber-200">
                <p className="font-semibold text-xs">
                  Step 3: Checkout Payment & Fulfillment Methods
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Select available payment and delivery options for customer checkouts.
                </p>
              </div>

              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Fulfillment Methods
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={standardDelivery}
                      onChange={(e) => setStandardDelivery(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Home Delivery
                      </p>
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
                      <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Store Pickup
                      </p>
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
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Pay cash upon delivery
                      </p>
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
                      <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Pay at Store
                      </p>
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
                      <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        Bank Transfer
                      </p>
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
                    <label
                      htmlFor="modal-bank-instructions"
                      className="block font-semibold mb-1 text-xs"
                    >
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
          )}

          {step === 4 && (
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
                    {[
                      standardDelivery && "Delivery",
                      storePickup && "Pickup",
                      cashOnDelivery && "COD",
                      bankTransfer && "Bank",
                      payAtStore && "Pay @ Store",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isPending}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            &larr; Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isPending ? "Saving..." : "Save & Continue →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              {isPending ? "Finalizing..." : "Complete Setup & Launch 🚀"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
