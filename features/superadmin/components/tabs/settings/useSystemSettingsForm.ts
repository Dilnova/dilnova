"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  updateSystemSettingsBatchAction,
  checkGoogleMerchantFeedHealthAction,
} from "@/features/superadmin/settings.actions";
import type { FeedHealthState } from "./types";

interface UseSystemSettingsFormParams {
  systemName: string;
  mediaLimit: number;
  logoUrl: string | null;
  faviconUrl: string | null;
  hardwareCustomEnabled: boolean;
  nurseryCustomEnabled: boolean;
  techCustomEnabled: boolean;
  servicesCustomEnabled: boolean;
  pinterestDomainVerify: string;
  googleSiteVerify: string;
  facebookDomainVerify: string;
  facebookDomainVerifyDilstar?: string;
  facebookDomainVerifyDilnova?: string;
  googleMerchantIdDilstar: string;
  googleMerchantIdDilnova: string;
}

export function useSystemSettingsForm({
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
  facebookDomainVerifyDilstar = "",
  facebookDomainVerifyDilnova = "",
  googleMerchantIdDilstar,
  googleMerchantIdDilnova,
}: UseSystemSettingsFormParams) {
  const [isPending, startTransition] = useTransition();

  const [systemNameInput, setSystemNameInput] = useState(systemName);
  const [mediaLimitInput, setMediaLimitInput] = useState(mediaLimit);
  const [hardwareCustomEnabledInput, setHardwareCustomEnabledInput] =
    useState(hardwareCustomEnabled);
  const [nurseryCustomEnabledInput, setNurseryCustomEnabledInput] = useState(nurseryCustomEnabled);
  const [techCustomEnabledInput, setTechCustomEnabledInput] = useState(techCustomEnabled);
  const [servicesCustomEnabledInput, setServicesCustomEnabledInput] =
    useState(servicesCustomEnabled);

  // SEO & Verification token state
  const [pinterestVerifyInput, setPinterestVerifyInput] = useState(pinterestDomainVerify);
  const [googleVerifyInput, setGoogleVerifyInput] = useState(googleSiteVerify);
  const [facebookVerifyDilstarInput, setFacebookVerifyDilstarInput] = useState(
    facebookDomainVerifyDilstar || facebookDomainVerify || "",
  );
  const [facebookVerifyDilnovaInput, setFacebookVerifyDilnovaInput] = useState(
    facebookDomainVerifyDilnova || "",
  );

  // Dual Google Merchant Center state
  const [googleMerchantIdDilstarInput, setGoogleMerchantIdDilstarInput] = useState(
    googleMerchantIdDilstar || "5848179436",
  );
  const [googleMerchantIdDilnovaInput, setGoogleMerchantIdDilnovaInput] = useState(
    googleMerchantIdDilnova || "5848718366",
  );
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null);

  // Media upload state
  const [logoInput, setLogoInput] = useState(logoUrl || "");
  const [faviconInput, setFaviconInput] = useState(faviconUrl || "");
  const [isMediaUploading, setIsMediaUploading] = useState(false);

  // Feed Health State
  const [dilstarHealth, setDilstarHealth] = useState<FeedHealthState>({
    checked: false,
    loading: false,
  });
  const [dilnovaHealth, setDilnovaHealth] = useState<FeedHealthState>({
    checked: false,
    loading: false,
  });

  const handleCheckFeedHealth = async (scope: "dilstar" | "all") => {
    const setter = scope === "dilstar" ? setDilstarHealth : setDilnovaHealth;
    setter((prev) => ({ ...prev, loading: true }));

    try {
      const res = await checkGoogleMerchantFeedHealthAction({ scope });
      if (res?.data?.success) {
        setter({
          checked: true,
          loading: false,
          success: true,
          productCount: res.data.productCount,
          latencyMs: res.data.latencyMs,
          lastBuildDate: res.data.lastBuildDate,
          sampleTitles: res.data.sampleTitles,
        });
        toast.success(
          `${scope === "dilstar" ? "Dilstar" : "Dilnova"} feed active: ${res.data.productCount} products recognized (${res.data.latencyMs}ms)`,
        );
      } else {
        const errMsg = res?.data?.error || res?.serverError || "Feed health check failed.";
        setter({
          checked: true,
          loading: false,
          success: false,
          error: errMsg,
        });
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error checking feed health.";
      setter({
        checked: true,
        loading: false,
        success: false,
        error: errMsg,
      });
      toast.error(errMsg);
    }
  };

  useEffect(() => {
    void handleCheckFeedHealth("dilstar");
    void handleCheckFeedHealth("all");
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeed(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedFeed(null), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await updateSystemSettingsBatchAction({
          settings: [
            { key: "system_name", value: systemNameInput },
            {
              key: "max_media_per_product",
              value: mediaLimitInput.toString(),
            },
            { key: "logo_url", value: logoInput },
            { key: "favicon_url", value: faviconInput },
            {
              key: "custom_hardware_storefront_enabled",
              value: hardwareCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_dilstar-hardware",
              value: hardwareCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_distar-hardware",
              value: hardwareCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_nursery_storefront_enabled",
              value: nurseryCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_dilstar-nursery",
              value: nurseryCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_distar-nursery",
              value: nurseryCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_tech_storefront_enabled",
              value: techCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_dilstar-tech",
              value: techCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_distar-tech",
              value: techCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_services_storefront_enabled",
              value: servicesCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_dilstar-services",
              value: servicesCustomEnabledInput ? "true" : "false",
            },
            {
              key: "custom_storefront_distar-services",
              value: servicesCustomEnabledInput ? "true" : "false",
            },
            // SEO & Domain Verification tokens
            {
              key: "pinterest_domain_verify",
              value: pinterestVerifyInput,
            },
            { key: "google_site_verify", value: googleVerifyInput },
            {
              key: "facebook_domain_verify_dilstar",
              value: facebookVerifyDilstarInput,
            },
            {
              key: "facebook_domain_verify_dilnova",
              value: facebookVerifyDilnovaInput,
            },
            {
              key: "facebook_domain_verify",
              value: facebookVerifyDilstarInput || facebookVerifyDilnovaInput,
            },
            // Google Merchant Center IDs
            {
              key: "google_merchant_id_dilstar",
              value: googleMerchantIdDilstarInput,
            },
            {
              key: "google_merchant_id_dilnova",
              value: googleMerchantIdDilnovaInput,
            },
          ],
        });

        if (res?.serverError) throw new Error(res.serverError);
        toast.success("System settings updated successfully.");
        // Refresh feed diagnostics
        void handleCheckFeedHealth("dilstar");
        void handleCheckFeedHealth("all");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update system settings.";
        toast.error(msg);
      }
    });
  };

  return {
    isPending,
    systemNameInput,
    setSystemNameInput,
    mediaLimitInput,
    setMediaLimitInput,
    hardwareCustomEnabledInput,
    setHardwareCustomEnabledInput,
    nurseryCustomEnabledInput,
    setNurseryCustomEnabledInput,
    techCustomEnabledInput,
    setTechCustomEnabledInput,
    servicesCustomEnabledInput,
    setServicesCustomEnabledInput,
    pinterestVerifyInput,
    setPinterestVerifyInput,
    googleVerifyInput,
    setGoogleVerifyInput,
    facebookVerifyDilstarInput,
    setFacebookVerifyDilstarInput,
    facebookVerifyDilnovaInput,
    setFacebookVerifyDilnovaInput,
    googleMerchantIdDilstarInput,
    setGoogleMerchantIdDilstarInput,
    googleMerchantIdDilnovaInput,
    setGoogleMerchantIdDilnovaInput,
    copiedFeed,
    logoInput,
    setLogoInput,
    faviconInput,
    setFaviconInput,
    isMediaUploading,
    setIsMediaUploading,
    dilstarHealth,
    dilnovaHealth,
    handleCheckFeedHealth,
    copyToClipboard,
    handleSaveSettings,
  };
}
