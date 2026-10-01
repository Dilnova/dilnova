"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { uploadToCloudinary } from "@/shared/media/cloudinary-upload";
import SafeProgressBar from "@/shared/ui/SafeProgressBar";
import DeliveryAddressFormFields from "@/features/customer/components/DeliveryAddressFormFields";

interface WizardStep1ProfileProps {
  description: string;
  setDescription: (val: string) => void;
  shippingAddress: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  phone: string;
  phone2: string;
  onAddressChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  stockAllocationMode: "target_branch" | "central_intake";
  setStockAllocationMode: (val: "target_branch" | "central_intake") => void;
  bannerUrl: string;
  setBannerUrl: (val: string) => void;
}

export default function WizardStep1Profile({
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
  onAddressChange,
  stockAllocationMode,
  setStockAllocationMode,
  bannerUrl,
  setBannerUrl,
}: WizardStep1ProfileProps) {
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3 text-purple-900 dark:text-purple-200">
        <p className="font-semibold text-xs">Step 1: Public Store Profile</p>
        <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
          These details will appear on your public storefront so customers can discover and trust
          your business.
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
          onChange={onAddressChange}
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
              <Image src={bannerUrl} alt="Store Banner Preview" fill className="object-cover" />
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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {isBannerUploading ? "Uploading Image..." : "Click to Upload Store Banner / Logo"}
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
  );
}
