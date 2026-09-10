"use client";

import SuperadminFormCard from "../ui/SuperadminFormCard";
import { useState, useEffect, useTransition, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/shared/media/cloudinary-upload";
import * as Sentry from "@sentry/nextjs";
import {
  updateSystemSettingAction,
  checkGoogleMerchantFeedHealthAction,
  verifyHeadMetadataAction,
} from "@/features/superadmin/settings.actions";
import CheckoutOptionsSettings from "../CheckoutOptionsSettings";
import { PendingOverlay } from "@/shared/ui/PendingOverlay";
import SafeProgressBar from "@/shared/ui/SafeProgressBar";
import StockAvailabilitySettings from "@/features/inventory/components/StockAvailabilitySettings";
import TaxClassesManager, { type TaxClassItem } from "./TaxClassesManager";
import type { CheckoutOptionDefinition } from "@/features/organization/checkout-options.shared";
import type { StockAvailabilityDefinition } from "@/features/inventory/availability.shared";

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
  googleMerchantIdDilstar,
  googleMerchantIdDilnova,
}: SettingsTabProps) {
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
  const [facebookVerifyInput, setFacebookVerifyInput] = useState(facebookDomainVerify);

  // Dual Google Merchant Center state
  const [googleMerchantIdDilstarInput, setGoogleMerchantIdDilstarInput] = useState(
    googleMerchantIdDilstar || "5848179436",
  );
  const [googleMerchantIdDilnovaInput, setGoogleMerchantIdDilnovaInput] = useState(
    googleMerchantIdDilnova || "5848718366",
  );
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null);

  // Feed Health State
  interface FeedHealthState {
    checked: boolean;
    loading: boolean;
    success?: boolean;
    productCount?: number;
    latencyMs?: number;
    lastBuildDate?: string | null;
    sampleTitles?: string[];
    error?: string;
  }

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

  // SEO & Head Tag Inspector State
  const [isVerifyingHead, setIsVerifyingHead] = useState(false);
  const [headVerificationResult, setHeadVerificationResult] = useState<{
    verified: boolean;
    checkedAt?: string;
    allActive?: boolean;
  } | null>(null);

  const handleVerifyHeadTags = async () => {
    setIsVerifyingHead(true);
    try {
      const res = await verifyHeadMetadataAction({});
      if (res?.data?.success) {
        setHeadVerificationResult({
          verified: true,
          checkedAt: new Date().toLocaleTimeString(),
          allActive: res.data.allActive,
        });
        if (res.data.allActive) {
          toast.success("All 3 verification meta tags active and served in <head>!");
        } else {
          toast.info("Verification tags checked — some tags are not configured yet.");
        }
      }
    } catch {
      toast.error("Failed to verify head metadata.");
    } finally {
      setIsVerifyingHead(false);
    }
  };

  const renderTokenStatusBadge = (current: string, initial: string) => {
    const isInitialConfigured = Boolean(initial && initial.trim().length > 0);
    const isDirty = current.trim() !== initial.trim();

    if (isDirty) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending Save
        </span>
      );
    }

    if (isInitialConfigured) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE IN &lt;head&gt;
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        Not Configured
      </span>
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFeed(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedFeed(null), 2500);
  };

  // Logo Upload State
  const [logoInput, setLogoInput] = useState(logoUrl || "");
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Favicon Upload State
  const [faviconInput, setFaviconInput] = useState(faviconUrl || "");
  const [isFaviconUploading, setIsFaviconUploading] = useState(false);
  const [faviconUploadProgress, setFaviconUploadProgress] = useState<number | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerNotification(false, "Logo file size exceeds 5MB limit.");
      return;
    }

    setIsLogoUploading(true);
    setLogoUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, {
        uploadKind: "platform",
        onProgress: (progress) => {
          setLogoUploadProgress(progress.percent);
        },
      });

      if (result.success && result.publicUrl) {
        setLogoInput(result.publicUrl);
        triggerNotification(true, "Logo uploaded successfully.");
      } else {
        triggerNotification(false, result.error || "Logo upload failed.");
      }
    } catch (err) {
      Sentry.captureException(err);
      triggerNotification(false, "An error occurred during logo upload.");
    } finally {
      setIsLogoUploading(false);
      setLogoUploadProgress(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerNotification(false, "Favicon file size exceeds 2MB limit.");
      return;
    }

    setIsFaviconUploading(true);
    setFaviconUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, {
        uploadKind: "platform",
        onProgress: (progress) => {
          setFaviconUploadProgress(progress.percent);
        },
      });

      if (result.success && result.publicUrl) {
        setFaviconInput(result.publicUrl);
        triggerNotification(true, "Favicon uploaded successfully.");
      } else {
        triggerNotification(false, result.error || "Favicon upload failed.");
      }
    } catch (err) {
      Sentry.captureException(err);
      triggerNotification(false, "An error occurred during favicon upload.");
    } finally {
      setIsFaviconUploading(false);
      setFaviconUploadProgress(null);
      if (faviconFileInputRef.current) faviconFileInputRef.current.value = "";
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const results = await Promise.all([
          updateSystemSettingAction({ key: "system_name", value: systemNameInput }),
          updateSystemSettingAction({
            key: "max_media_per_product",
            value: mediaLimitInput.toString(),
          }),
          updateSystemSettingAction({ key: "logo_url", value: logoInput }),
          updateSystemSettingAction({ key: "favicon_url", value: faviconInput }),
          updateSystemSettingAction({
            key: "custom_hardware_storefront_enabled",
            value: hardwareCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_dilstar-hardware",
            value: hardwareCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_distar-hardware",
            value: hardwareCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_nursery_storefront_enabled",
            value: nurseryCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_dilstar-nursery",
            value: nurseryCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_distar-nursery",
            value: nurseryCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_tech_storefront_enabled",
            value: techCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_dilstar-tech",
            value: techCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_distar-tech",
            value: techCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_services_storefront_enabled",
            value: servicesCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_dilstar-services",
            value: servicesCustomEnabledInput ? "true" : "false",
          }),
          updateSystemSettingAction({
            key: "custom_storefront_distar-services",
            value: servicesCustomEnabledInput ? "true" : "false",
          }),
          // SEO & Domain Verification tokens
          updateSystemSettingAction({
            key: "pinterest_domain_verify",
            value: pinterestVerifyInput,
          }),
          updateSystemSettingAction({ key: "google_site_verify", value: googleVerifyInput }),
          updateSystemSettingAction({ key: "facebook_domain_verify", value: facebookVerifyInput }),
          // Google Merchant Center IDs
          updateSystemSettingAction({
            key: "google_merchant_id_dilstar",
            value: googleMerchantIdDilstarInput,
          }),
          updateSystemSettingAction({
            key: "google_merchant_id_dilnova",
            value: googleMerchantIdDilnovaInput,
          }),
        ]);
        const firstError = results.find((r) => r?.serverError);
        if (firstError?.serverError) throw new Error(firstError.serverError);
        triggerNotification(true, "System settings updated successfully.");
        // Refresh feed diagnostics
        void handleCheckFeedHealth("dilstar");
        void handleCheckFeedHealth("all");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update system settings.";
        triggerNotification(false, msg);
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <PendingOverlay isPending={isPending} />

      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">
          System Settings
        </h2>
        <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">
          Configure system thresholds and branding
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* Application Name */}
        <SuperadminFormCard title="Application Name" icon="🏷️" className="space-y-3">
          <input
            type="text"
            required
            maxLength={100}
            value={systemNameInput}
            onChange={(e) => setSystemNameInput(e.target.value)}
            className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
            placeholder="e.g. Dilnova Hub"
          />
          <p className="text-[10px] text-zinc-400">
            The global display name of the application, used in header titles, layouts, metadata,
            and automated emails.
          </p>
        </SuperadminFormCard>

        {/* Media Limit */}
        <SuperadminFormCard title="Media Upload Limit" icon="📊" className="space-y-3">
          <input
            type="number"
            min="1"
            max="20"
            inputMode="numeric"
            required
            value={mediaLimitInput}
            onChange={(e) => setMediaLimitInput(parseInt(e.target.value, 10) || 1)}
            className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
          />
          <p className="text-[10px] text-zinc-400">Max images/videos per product listing (1–20).</p>
        </SuperadminFormCard>

        {/* Logo */}
        <SuperadminFormCard title="System Logo" icon="🖼️" className="space-y-3">
          {logoInput ? (
            <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
                <Image src={logoInput} alt="" fill className="object-contain" sizes="64px" />
              </div>
              <button
                type="button"
                onClick={() => setLogoInput("")}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoFileInputRef.current?.click()}
              disabled={isLogoUploading}
              className="w-full py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg
                className="w-7 h-7 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {isLogoUploading ? "Uploading..." : "Upload Logo"}
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">PNG, JPG, WEBP (Max 5MB)</span>
            </button>
          )}
          <input
            type="file"
            ref={logoFileInputRef}
            onChange={handleLogoUpload}
            accept="image/*"
            className="hidden"
          />
          {isLogoUploading && logoUploadProgress !== null && (
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <SafeProgressBar
                className="h-full bg-purple-600 rounded-full transition-all"
                percent={logoUploadProgress}
              />
            </div>
          )}
        </SuperadminFormCard>

        {/* Favicon */}
        <SuperadminFormCard title="Favicon Icon" icon="⭐" className="space-y-3">
          {faviconInput ? (
            <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
                <Image src={faviconInput} alt="" fill className="object-contain" sizes="40px" />
              </div>
              <button
                type="button"
                onClick={() => setFaviconInput("")}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => faviconFileInputRef.current?.click()}
              disabled={isFaviconUploading}
              className="w-full py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="text-2xl">⭐</span>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {isFaviconUploading ? "Uploading..." : "Upload Favicon"}
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">ICO, PNG (Max 2MB)</span>
            </button>
          )}
          <input
            type="file"
            ref={faviconFileInputRef}
            onChange={handleFaviconUpload}
            accept="image/*"
            className="hidden"
          />
          {isFaviconUploading && faviconUploadProgress !== null && (
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <SafeProgressBar
                className="h-full bg-purple-600 rounded-full transition-all"
                percent={faviconUploadProgress}
              />
            </div>
          )}
        </SuperadminFormCard>

        {/* Custom Storefront Toggles */}
        <SuperadminFormCard title="Custom Storefront Layouts" icon="🎨" className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="toggle-hardware"
                  className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  Dilstar Hardware Storefront
                </label>
                {hardwareCustomEnabledInput ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Custom Layout Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Standard View
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Dilstar Hardware
              </p>
            </div>
            <button
              id="toggle-hardware"
              type="button"
              onClick={() => setHardwareCustomEnabledInput(!hardwareCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                hardwareCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
              aria-pressed={hardwareCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  hardwareCustomEnabledInput ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="toggle-nursery"
                  className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  Dilstar Nursery Storefront
                </label>
                {nurseryCustomEnabledInput ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Custom Layout Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Standard View
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Dilstar Nursery
              </p>
            </div>
            <button
              id="toggle-nursery"
              type="button"
              onClick={() => setNurseryCustomEnabledInput(!nurseryCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                nurseryCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
              aria-pressed={nurseryCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  nurseryCustomEnabledInput ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="toggle-tech"
                  className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  Dilstar Tech Shop Storefront
                </label>
                {techCustomEnabledInput ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Custom Layout Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Standard View
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Dilstar Tech Shop
              </p>
            </div>
            <button
              id="toggle-tech"
              type="button"
              onClick={() => setTechCustomEnabledInput(!techCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                techCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
              aria-pressed={techCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  techCustomEnabledInput ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="toggle-services"
                  className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  Dilstar Services Storefront
                </label>
                {servicesCustomEnabledInput ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Custom Layout Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Standard View
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Dilstar Services
              </p>
            </div>
            <button
              id="toggle-services"
              type="button"
              onClick={() => setServicesCustomEnabledInput(!servicesCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                servicesCustomEnabledInput ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
              aria-pressed={servicesCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  servicesCustomEnabledInput ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </SuperadminFormCard>

        {/* Google Merchant Center & Global Feeds */}
        <SuperadminFormCard
          title="Google Merchant Center & Global Feeds"
          icon="🛍️"
          className="space-y-5"
        >
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Centralized Google Shopping and Free Search Listings management for both the Dilstar
            Flagship Brand and Dilnova Multi-Vendor Marketplace. Feeds update automatically every 24
            hours.
          </p>

          {/* Dilstar Feed Card */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🏪</span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Dilstar Flagship Feed (dilstar.pp.ua)
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Scoped exclusively to Dilstar Hardware, Nursery, Tech &amp; Motors in
                    Ambalantota
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Brand Store
                </span>
                {dilstarHealth.checked && dilstarHealth.success && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 block">
                Google Merchant Center ID (Dilstar)
              </label>
              <input
                type="text"
                maxLength={40}
                value={googleMerchantIdDilstarInput}
                onChange={(e) => setGoogleMerchantIdDilstarInput(e.target.value)}
                placeholder="5848179436"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-950 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 block">
                Live XML Feed URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://dilstar.pp.ua/api/feeds/google-merchant"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] bg-zinc-100/80 dark:bg-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 select-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      "https://dilstar.pp.ua/api/feeds/google-merchant",
                      "Dilstar Feed URL",
                    )
                  }
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                >
                  {copiedFeed === "Dilstar Feed URL" ? "Copied!" : "Copy"}
                </button>
                <a
                  href="/api/feeds/google-merchant?scope=dilstar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold shrink-0 transition-colors"
                >
                  View XML
                </a>
              </div>
            </div>

            {/* Live Feed Status & Diagnostic */}
            <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {dilstarHealth.loading ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    <span className="w-2 h-2 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    Pinging live feed...
                  </span>
                ) : dilstarHealth.checked && dilstarHealth.success ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ACTIVE • 200 OK
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      📦 {dilstarHealth.productCount} Products Included
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ⚡ {dilstarHealth.latencyMs}ms
                    </span>
                  </div>
                ) : dilstarHealth.checked && !dilstarHealth.success ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Offline: {dilstarHealth.error || "Feed error"}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Status: Checking live feed...
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleCheckFeedHealth("dilstar")}
                disabled={dilstarHealth.loading}
                className="px-2.5 py-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
              >
                {dilstarHealth.loading ? "Pinging..." : "🔄 Test Live Status"}
              </button>
            </div>

            {/* Sample Products Preview if present */}
            {dilstarHealth.sampleTitles && dilstarHealth.sampleTitles.length > 0 && (
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Sample Recognized Feed Items:</span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Ready for Googlebot
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {dilstarHealth.sampleTitles.map((title, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] text-zinc-800 dark:text-zinc-200 font-mono truncate max-w-[200px]"
                      title={title}
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dilnova Feed Card */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Dilnova Marketplace Master Feed (dilnova.pp.ua)
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Aggregates all approved multi-vendor marketplace products with vendor brand
                    attribution
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                  Multi-Vendor
                </span>
                {dilnovaHealth.checked && dilnovaHealth.success && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 block">
                Google Merchant Center ID (Dilnova)
              </label>
              <input
                type="text"
                maxLength={40}
                value={googleMerchantIdDilnovaInput}
                onChange={(e) => setGoogleMerchantIdDilnovaInput(e.target.value)}
                placeholder="5848718366"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-950 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 block">
                Live XML Feed URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://dilnova.pp.ua/api/feeds/google-merchant"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] bg-zinc-100/80 dark:bg-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 select-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      "https://dilnova.pp.ua/api/feeds/google-merchant",
                      "Dilnova Feed URL",
                    )
                  }
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                >
                  {copiedFeed === "Dilnova Feed URL" ? "Copied!" : "Copy"}
                </button>
                <a
                  href="/api/feeds/google-merchant?scope=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold shrink-0 transition-colors"
                >
                  View XML
                </a>
              </div>
            </div>

            {/* Live Feed Status & Diagnostic */}
            <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {dilnovaHealth.loading ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    <span className="w-2 h-2 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    Pinging live feed...
                  </span>
                ) : dilnovaHealth.checked && dilnovaHealth.success ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ACTIVE • 200 OK
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      📦 {dilnovaHealth.productCount} Products Serving
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ⚡ {dilnovaHealth.latencyMs}ms
                    </span>
                  </div>
                ) : dilnovaHealth.checked && !dilnovaHealth.success ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Offline: {dilnovaHealth.error || "Feed error"}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Status: Checking live feed...
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleCheckFeedHealth("all")}
                disabled={dilnovaHealth.loading}
                className="px-2.5 py-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
              >
                {dilnovaHealth.loading ? "Pinging..." : "🔄 Test Live Status"}
              </button>
            </div>

            {/* Sample Products Preview if present */}
            {dilnovaHealth.sampleTitles && dilnovaHealth.sampleTitles.length > 0 && (
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Sample Recognized Feed Items:</span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Ready for Googlebot
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {dilnovaHealth.sampleTitles.map((title, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] text-zinc-800 dark:text-zinc-200 font-mono truncate max-w-[200px]"
                      title={title}
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SuperadminFormCard>

        {/* SEO & Domain Verification */}
        <SuperadminFormCard title="SEO & Domain Verification" icon="🔍" className="space-y-4">
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Public domain-ownership tokens injected into{" "}
            <code className="font-mono text-purple-600 dark:text-purple-400">&lt;meta&gt;</code>{" "}
            tags in the site&apos;s{" "}
            <code className="font-mono text-purple-600 dark:text-purple-400">&lt;head&gt;</code>.
            Changes here take effect on the next page request — no redeploy needed.
          </p>

          {/* Pinterest */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>🎯</span> Pinterest Domain Verify
              </label>
              {renderTokenStatusBadge(pinterestVerifyInput, pinterestDomainVerify)}
            </div>
            <input
              type="text"
              maxLength={64}
              value={pinterestVerifyInput}
              onChange={(e) => setPinterestVerifyInput(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-zinc-400"
              placeholder="e.g. a1b2c3d4e5f60718293a4b5c6d7e8f9a"
            />
            <p className="text-[10px] text-zinc-400">
              From:{" "}
              <a
                href="https://www.pinterest.com/business/hub/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:underline"
              >
                Pinterest Business Hub
              </a>{" "}
              → Claim Website → HTML tag method → copy only the{" "}
              <code className="font-mono">content=&quot;…&quot;</code> value.
            </p>
          </div>

          {/* Google */}
          <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-900 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>🔎</span> Google Site Verify
              </label>
              {renderTokenStatusBadge(googleVerifyInput, googleSiteVerify)}
            </div>
            <input
              type="text"
              maxLength={64}
              value={googleVerifyInput}
              onChange={(e) => setGoogleVerifyInput(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-zinc-400"
              placeholder="e.g. abc123XYZ..."
            />
            <p className="text-[10px] text-zinc-400">
              From:{" "}
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:underline"
              >
                Google Search Console
              </a>{" "}
              → Add property → HTML tag method → copy only the{" "}
              <code className="font-mono">content=&quot;…&quot;</code> value.
            </p>
          </div>

          {/* Facebook */}
          <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-900 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>📘</span> Facebook Domain Verify
              </label>
              {renderTokenStatusBadge(facebookVerifyInput, facebookDomainVerify)}
            </div>
            <input
              type="text"
              maxLength={64}
              value={facebookVerifyInput}
              onChange={(e) => setFacebookVerifyInput(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-zinc-400"
              placeholder="e.g. abcdefgh12345678"
            />
            <p className="text-[10px] text-zinc-400">
              From:{" "}
              <a
                href="https://business.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:underline"
              >
                Meta Business Suite
              </a>{" "}
              → Brand Safety → Domains → Add domain → copy only the{" "}
              <code className="font-mono">content=&quot;…&quot;</code> value.
            </p>
          </div>

          {/* Live Head Tag Inspector */}
          <div className="p-3 rounded-xl bg-zinc-900 text-zinc-100 dark:bg-zinc-950 border border-zinc-800 space-y-2.5 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs">🛰️</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                  Live &lt;head&gt; Meta Tag Inspector
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerifyHeadTags}
                disabled={isVerifyingHead}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
              >
                {isVerifyingHead ? "Verifying..." : "⚡ Verify Live DB/Cache Sync"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              The exact verification tags injected into the HTML document root by Next.js for
              Google, Pinterest, and Meta crawlers:
            </p>
            <div className="space-y-1 font-mono text-[10px] bg-black/60 p-2.5 rounded-lg border border-zinc-800 overflow-x-auto">
              {pinterestVerifyInput?.trim() ? (
                <div className="text-emerald-400">
                  &lt;meta name=&quot;p:domain_verify&quot; content=&quot;
                  {pinterestVerifyInput.trim()}&quot; /&gt;
                </div>
              ) : (
                <div className="text-zinc-600">
                  &lt;!-- Pinterest domain verification inactive --&gt;
                </div>
              )}
              {googleVerifyInput?.trim() ? (
                <div className="text-emerald-400">
                  &lt;meta name=&quot;google-site-verification&quot; content=&quot;
                  {googleVerifyInput.trim()}&quot; /&gt;
                </div>
              ) : (
                <div className="text-zinc-600">
                  &lt;!-- Google site verification inactive --&gt;
                </div>
              )}
              {facebookVerifyInput?.trim() ? (
                <div className="text-emerald-400">
                  &lt;meta name=&quot;facebook-domain-verification&quot; content=&quot;
                  {facebookVerifyInput.trim()}&quot; /&gt;
                </div>
              ) : (
                <div className="text-zinc-600">
                  &lt;!-- Facebook domain verification inactive --&gt;
                </div>
              )}
            </div>
            {headVerificationResult && (
              <div className="pt-1.5 flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-800/80">
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span>✓</span> Verified active in system cache at{" "}
                  {headVerificationResult.checkedAt}
                </span>
                <span className="font-mono text-[9px]">Status: Healthy</span>
              </div>
            )}
          </div>
        </SuperadminFormCard>

        {/* Save button */}
        <button
          type="submit"
          disabled={isPending || isLogoUploading || isFaviconUploading}
          className="w-full py-3.5 sm:py-3 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/15 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isPending ? (
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
