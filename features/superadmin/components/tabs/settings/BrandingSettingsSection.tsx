"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { uploadToCloudinary } from "@/shared/media/cloudinary-upload";
import SafeProgressBar from "@/shared/ui/SafeProgressBar";
import SuperadminFormCard from "../../ui/SuperadminFormCard";

interface BrandingSettingsSectionProps {
  logoInput: string;
  setLogoInput: (val: string) => void;
  faviconInput: string;
  setFaviconInput: (val: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export default function BrandingSettingsSection({
  logoInput,
  setLogoInput,
  faviconInput,
  setFaviconInput,
  onUploadingChange,
}: BrandingSettingsSectionProps) {
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const [isFaviconUploading, setIsFaviconUploading] = useState(false);
  const [faviconUploadProgress, setFaviconUploadProgress] = useState<number | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);

  const setLogoUploading = (uploading: boolean) => {
    setIsLogoUploading(uploading);
    onUploadingChange?.(uploading || isFaviconUploading);
  };

  const setFaviconUploading = (uploading: boolean) => {
    setIsFaviconUploading(uploading);
    onUploadingChange?.(isLogoUploading || uploading);
  };

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

    setLogoUploading(true);
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
      setLogoUploading(false);
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

    setFaviconUploading(true);
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
      setFaviconUploading(false);
      setFaviconUploadProgress(null);
      if (faviconFileInputRef.current) faviconFileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Logo */}
      <SuperadminFormCard title="System Logo" icon="🖼️" className="space-y-3">
        {logoInput ? (
          <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
            <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
              <Image
                src={logoInput}
                alt="System logo preview"
                fill
                className="object-contain"
                sizes="64px"
              />
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
              <Image
                src={faviconInput}
                alt="Favicon preview"
                fill
                className="object-contain"
                sizes="40px"
              />
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
    </>
  );
}
