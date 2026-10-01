"use client";

import {
  Share2,
  Sparkles,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Loader2,
  Save,
} from "lucide-react";
import type { DiscoveredPage, TestResult } from "./types";

interface FacebookFeedSettingsProps {
  isPending: boolean;
  facebookPageId: string;
  setFacebookPageId: (id: string) => void;
  facebookPageAccessToken: string;
  setFacebookPageAccessToken: (token: string) => void;
  hasExistingPageToken: boolean;
  showPageToken: boolean;
  setShowPageToken: (show: boolean) => void;
  discoveredPages: DiscoveredPage[];
  isDiscoveringPages: boolean;
  discoveryError: string | null;
  testResult: TestResult | null;
  onDiscoverPages: () => void;
  onSelectDiscoveredPage: (page: DiscoveredPage) => void;
  onSave: () => void;
  onTestConnection: () => void;
}

export function FacebookFeedSettings({
  isPending,
  facebookPageId,
  setFacebookPageId,
  facebookPageAccessToken,
  setFacebookPageAccessToken,
  hasExistingPageToken,
  showPageToken,
  setShowPageToken,
  discoveredPages,
  isDiscoveringPages,
  discoveryError,
  testResult,
  onDiscoverPages,
  onSelectDiscoveredPage,
  onSave,
  onTestConnection,
}: FacebookFeedSettingsProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 font-mono flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Facebook Page Feed Auto-Posting
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Automatically publishes photo posts to your Facebook Page timeline feed whenever a
            product is added.
          </p>
        </div>
        <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>

      {/* Step 1: Choose Your Token Type & Get Meta Access Token */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-mono">
              1
            </span>
            Choose Your Token Type & Get Meta Access Token
          </span>
        </div>

        {/* Token Comparison: Permanent vs Temporary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          {/* Option 1: Permanent System User Token */}
          <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  🛡️ Option 1: System User Token
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white tracking-wide uppercase">
                  Permanent • Recommended
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                Generated in Meta Business Suite under <strong>System Users</strong>.
              </p>
              <div className="mt-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5 text-emerald-900 dark:text-emerald-200">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>PRO: Never Expires!</strong> Feed posts & sync run 24/7 indefinitely
                    without breaking.
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <span className="text-[11px] shrink-0 mt-0.5">ℹ️</span>
                  <span>
                    <strong>CON:</strong> Takes 1–2 minutes to create a System User once in Meta
                    Suite.
                  </span>
                </div>
              </div>
            </div>
            <a
              href="https://business.facebook.com/latest/settings/system_users"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer text-center"
            >
              🛡️ Open Meta System Users (Never Expires) <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Option 2: Graph API Explorer Token */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  ⚡ Option 2: Graph API Explorer
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 uppercase">
                  Temporary • Fast
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                Generated in 10 seconds via Meta&apos;s developer test console.
              </p>
              <div className="mt-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5 text-amber-900 dark:text-amber-200">
                  <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>PRO:</strong> Instant 10-second token creation right in your browser.
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                  <span className="text-[11px] shrink-0 mt-0.5">⚠️</span>
                  <span>
                    <strong>CON (Warning):</strong> Hard 24-hour expiry! Auto-posting stops working
                    after 1 day until re-pasted daily.
                  </span>
                </div>
              </div>
            </div>
            <a
              href="https://developers.facebook.com/tools/explorer/?method=GET&path=me%2Faccounts&version=v21.0"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs cursor-pointer text-center"
            >
              🔑 Open Graph API Explorer (Expires in 24h) <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
          Required Facebook Page permissions for your token:
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            pages_manage_posts
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            pages_read_engagement
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            pages_show_list
          </span>
        </div>

        <div className="pt-2">
          <label
            htmlFor="fb-page-access-token"
            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
          >
            Paste Access Token (User or Page Token)
          </label>
          <div className="relative">
            <input
              id="fb-page-access-token"
              type={showPageToken ? "text" : "password"}
              placeholder={
                hasExistingPageToken
                  ? "••••••••••••••••••••••••••••••••"
                  : "Paste token starting with EAA..."
              }
              aria-label="Paste Access Token (User or Page Token)"
              value={facebookPageAccessToken}
              onChange={(e) => setFacebookPageAccessToken(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPageToken(!showPageToken)}
              aria-label={showPageToken ? "Hide access token" : "Show access token"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              {showPageToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Select Facebook Page */}
      <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-[10px] font-mono">
              2
            </span>
            Select or Enter Your Facebook Page
          </span>
          <button
            type="button"
            onClick={onDiscoverPages}
            disabled={isDiscoveringPages || isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDiscoveringPages ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            🔍 Auto-Detect My Facebook Pages
          </button>
        </div>

        {discoveryError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
            {discoveryError}
          </div>
        )}

        {discoveredPages.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-zinc-500 block uppercase tracking-wider">
              Select your target page:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {discoveredPages.map((page) => {
                const isSelected = facebookPageId === page.id;
                return (
                  <button
                    type="button"
                    key={page.id}
                    onClick={() => onSelectDiscoveredPage(page)}
                    className={`p-3 rounded-xl border transition-all text-left cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 shadow-xs ring-1 ring-blue-500"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {page.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                          {page.name}
                          {isSelected && <Check className="h-3 w-3 text-blue-600 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate">
                          ID: {page.id}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2">
          <label
            htmlFor="fb-page-id"
            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
          >
            Facebook Page ID (Numeric)
          </label>
          <input
            id="fb-page-id"
            type="text"
            placeholder="e.g. 1366821166509556"
            aria-label="Facebook Page ID (Numeric)"
            value={facebookPageId}
            onChange={(e) => setFacebookPageId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Facebook Settings
          </button>
          <button
            type="button"
            onClick={onTestConnection}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" /> Test Connection
          </button>
        </div>
        {testResult && (
          <span
            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              testResult.valid
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
            }`}
          >
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
