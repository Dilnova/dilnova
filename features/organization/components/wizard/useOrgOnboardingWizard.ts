"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateVendorMetadata, completeOrgOnboarding } from "@/features/vendor/actions";
import { updateOrgCurrencyAction } from "@/features/organization/org-currency.actions";
import { updateOrgCheckoutOptionsAction } from "@/features/organization/checkout-options.actions";
import type { OrgOnboardingStatus } from "@/features/organization/onboarding";

interface UseOrgOnboardingWizardParams {
  status: OrgOnboardingStatus;
  onClose: () => void;
  onSuccess?: () => void;
}

export function useOrgOnboardingWizard({
  status,
  onClose,
  onSuccess,
}: UseOrgOnboardingWizardParams) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [isPending, startTransition] = useTransition();

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

  const handleSaveStep1 = async () => {
    if (!description.trim()) {
      toast.error("Store Description is mandatory.");
      return false;
    }

    if (!address.trim()) {
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
        address: address.trim(),
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

  return {
    step,
    setStep,
    isPending,
    startTransition,
    currentProgressPercent,
    // Step 1
    description,
    setDescription,
    shippingAddress,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountry,
    phone,
    phone2,
    bannerUrl,
    setBannerUrl,
    stockAllocationMode,
    setStockAllocationMode,
    handleAddressChange,
    address,
    // Step 2
    baseCurrency,
    setBaseCurrency,
    fxMarkupPercent,
    setFxMarkupPercent,
    defaultTaxClassId,
    setDefaultTaxClassId,
    // Step 3
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
    // Actions
    handleNext,
    handleFinish,
  };
}
