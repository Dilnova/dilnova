"use client";

import CheckoutOptionsSettings from "../CheckoutOptionsSettings";
import { PendingOverlay } from "@/shared/ui/PendingOverlay";
import StockAvailabilitySettings from "@/features/inventory/components/StockAvailabilitySettings";
import TaxClassesManager, { type TaxClassItem } from "./TaxClassesManager";
import type { CheckoutOptionDefinition } from "@/features/organization/checkout-options.shared";
import type { StockAvailabilityDefinition } from "@/features/inventory/availability.shared";
import {
  GeneralSettingsSection,
  BrandingSettingsSection,
  StorefrontLayoutsSection,
  GoogleMerchantSection,
  SeoVerificationSection,
  useSystemSettingsForm,
} from "./settings";

interface SettingsTabProps {
  systemName: string;
  mediaLimit: number;
  logoUrl: string | null;
  faviconUrl: string | null;
  hardwareCustomEnabled: boolean;
  nurseryCustomEnabled: boolean;
  techCustomEnabled: boolean;
  servicesCustomEnabled: boolean;
  checkoutOptionsCatalog: CheckoutOptionDefinition[];
  stockAvailabilityCatalog: StockAvailabilityDefinition[];
  taxClasses?: TaxClassItem[];
  // SEO & Domain Verification (public tokens, not secrets)
  pinterestDomainVerify: string;
  googleSiteVerify: string;
  facebookDomainVerify: string;
  facebookDomainVerifyDilstar?: string;
  facebookDomainVerifyDilnova?: string;
  // Google Merchant Center IDs
  googleMerchantIdDilstar: string;
  googleMerchantIdDilnova: string;
}

export default function SettingsTab({
  systemName,
  mediaLimit,
  logoUrl,
  faviconUrl,
  hardwareCustomEnabled,
  nurseryCustomEnabled,
  techCustomEnabled,
  servicesCustomEnabled,
  checkoutOptionsCatalog,
  stockAvailabilityCatalog,
  taxClasses = [],
  pinterestDomainVerify,
  googleSiteVerify,
  facebookDomainVerify,
  facebookDomainVerifyDilstar = "",
  facebookDomainVerifyDilnova = "",
  googleMerchantIdDilstar,
  googleMerchantIdDilnova,
}: SettingsTabProps) {
  const form = useSystemSettingsForm({
    systemName,
    mediaLimit,
    logoUrl,
    faviconUrl,
    hardwareCustomEnabled,
    nurseryCustomEnabled,
    techCustomEnabled,
    servicesCustomEnabled,
    pinterestDomainVerify,
    googleSiteVerify,
    facebookDomainVerify,
    facebookDomainVerifyDilstar,
    facebookDomainVerifyDilnova,
    googleMerchantIdDilstar,
    googleMerchantIdDilnova,
  });

  return (
    <div className="max-w-2xl space-y-4">
      <PendingOverlay isPending={form.isPending} />

      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">
          System Settings
        </h2>
        <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">
          Configure system thresholds and branding
        </p>
      </div>

      <form onSubmit={form.handleSaveSettings} className="space-y-4">
        <GeneralSettingsSection
          systemNameInput={form.systemNameInput}
          setSystemNameInput={form.setSystemNameInput}
          mediaLimitInput={form.mediaLimitInput}
          setMediaLimitInput={form.setMediaLimitInput}
        />

        <BrandingSettingsSection
          logoInput={form.logoInput}
          setLogoInput={form.setLogoInput}
          faviconInput={form.faviconInput}
          setFaviconInput={form.setFaviconInput}
          onUploadingChange={form.setIsMediaUploading}
        />

        <StorefrontLayoutsSection
          hardwareCustomEnabledInput={form.hardwareCustomEnabledInput}
          setHardwareCustomEnabledInput={form.setHardwareCustomEnabledInput}
          nurseryCustomEnabledInput={form.nurseryCustomEnabledInput}
          setNurseryCustomEnabledInput={form.setNurseryCustomEnabledInput}
          techCustomEnabledInput={form.techCustomEnabledInput}
          setTechCustomEnabledInput={form.setTechCustomEnabledInput}
          servicesCustomEnabledInput={form.servicesCustomEnabledInput}
          setServicesCustomEnabledInput={form.setServicesCustomEnabledInput}
        />

        <GoogleMerchantSection
          googleMerchantIdDilstarInput={form.googleMerchantIdDilstarInput}
          setGoogleMerchantIdDilstarInput={form.setGoogleMerchantIdDilstarInput}
          googleMerchantIdDilnovaInput={form.googleMerchantIdDilnovaInput}
          setGoogleMerchantIdDilnovaInput={form.setGoogleMerchantIdDilnovaInput}
          dilstarHealth={form.dilstarHealth}
          dilnovaHealth={form.dilnovaHealth}
          onCheckFeedHealth={form.handleCheckFeedHealth}
          copiedFeed={form.copiedFeed}
          onCopyFeed={form.copyToClipboard}
        />

        <SeoVerificationSection
          pinterestVerifyInput={form.pinterestVerifyInput}
          setPinterestVerifyInput={form.setPinterestVerifyInput}
          pinterestDomainVerify={pinterestDomainVerify}
          googleVerifyInput={form.googleVerifyInput}
          setGoogleVerifyInput={form.setGoogleVerifyInput}
          googleSiteVerify={googleSiteVerify}
          facebookVerifyDilstarInput={form.facebookVerifyDilstarInput}
          setFacebookVerifyDilstarInput={form.setFacebookVerifyDilstarInput}
          facebookDomainVerifyDilstar={facebookDomainVerifyDilstar || facebookDomainVerify}
          facebookVerifyDilnovaInput={form.facebookVerifyDilnovaInput}
          setFacebookVerifyDilnovaInput={form.setFacebookVerifyDilnovaInput}
          facebookDomainVerifyDilnova={facebookDomainVerifyDilnova}
          onCopyText={form.copyToClipboard}
        />

        {/* Save button */}
        <button
          type="submit"
          disabled={form.isPending || form.isMediaUploading}
          className="w-full py-3.5 sm:py-3 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/15 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {form.isPending ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving...
            </>
          ) : (
            "Save All Settings"
          )}
        </button>
      </form>

      <CheckoutOptionsSettings initialCatalog={checkoutOptionsCatalog} />

      <StockAvailabilitySettings initialCatalog={stockAvailabilityCatalog} />

      {taxClasses && <TaxClassesManager taxClasses={taxClasses} />}
    </div>
  );
}
