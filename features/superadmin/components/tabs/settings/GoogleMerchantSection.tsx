"use client";

import SuperadminFormCard from "../../ui/SuperadminFormCard";
import type { FeedHealthState } from "./types";

interface GoogleMerchantSectionProps {
  googleMerchantIdDilstarInput: string;
  setGoogleMerchantIdDilstarInput: (val: string) => void;
  googleMerchantIdDilnovaInput: string;
  setGoogleMerchantIdDilnovaInput: (val: string) => void;
  dilstarHealth: FeedHealthState;
  dilnovaHealth: FeedHealthState;
  onCheckFeedHealth: (scope: "dilstar" | "all") => void;
  copiedFeed: string | null;
  onCopyFeed: (text: string, label: string) => void;
}

export default function GoogleMerchantSection({
  googleMerchantIdDilstarInput,
  setGoogleMerchantIdDilstarInput,
  googleMerchantIdDilnovaInput,
  setGoogleMerchantIdDilnovaInput,
  dilstarHealth,
  dilnovaHealth,
  onCheckFeedHealth,
  copiedFeed,
  onCopyFeed,
}: GoogleMerchantSectionProps) {
  return (
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
                Scoped exclusively to Dilstar Hardware, Nursery, Tech &amp; Motors in Ambalantota
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
                onCopyFeed("https://dilstar.pp.ua/api/feeds/google-merchant", "Dilstar Feed URL")
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
            onClick={() => onCheckFeedHealth("dilstar")}
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
                onCopyFeed("https://dilnova.pp.ua/api/feeds/google-merchant", "Dilnova Feed URL")
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
            onClick={() => onCheckFeedHealth("all")}
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
  );
}
