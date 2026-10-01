"use client";

import Link from "next/link";
import { Share2, HelpCircle, Save, Loader2, Check } from "lucide-react";

export interface SocialSettingsHeaderProps {
  syncStatus: string;
  showGuide: boolean;
  onToggleGuide: () => void;
  isPending: boolean;
  onSave: () => void;
}

export function SocialSettingsHeader({
  syncStatus,
  showGuide,
  onToggleGuide,
  isPending,
  onSave,
}: SocialSettingsHeaderProps) {
  return (
    <>
      {/* Navigation Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-5"
      >
        <Link href="/vendor" className="hover:text-zinc-900 dark:hover:text-zinc-200">
          Vendor Console
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-semibold" aria-current="page">
          Social Media &amp; Messaging Automation
        </span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shrink-0">
            <Share2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Social Media &amp; Messaging Automation
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  syncStatus === "connected"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {syncStatus === "connected" ? (
                  <>
                    <Check className="h-3 w-3" aria-hidden="true" /> Active &amp; Synced
                  </>
                ) : (
                  "Ready to Connect"
                )}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Automated multi-channel publishing to Facebook, WhatsApp, Instagram, and Pinterest,
              with optional enterprise Meta Catalog sync.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleGuide}
            aria-expanded={showGuide}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-purple-500" aria-hidden="true" />
            {showGuide ? "Hide Setup Guide" : "View Setup Guide"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" /> Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default SocialSettingsHeader;
