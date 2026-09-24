"use client";

import { Sparkles, Check, ExternalLink, Zap, Loader2, Save } from "lucide-react";
import type { DiscoveredInstagramAccount, TestResult } from "./types";

interface InstagramFeedSettingsProps {
  isPending: boolean;
  instagramAccountId: string;
  setInstagramAccountId: (id: string) => void;
  discoveredInstagramAccount: DiscoveredInstagramAccount | null;
  isDiscoveringInstagram: boolean;
  instagramDiscoveryError: string | null;
  testResult: TestResult | null;
  onDiscoverInstagram: () => void;
  onSave: () => void;
  onTestConnection: () => void;
}

export function InstagramFeedSettings({
  isPending,
  instagramAccountId,
  setInstagramAccountId,
  discoveredInstagramAccount,
  isDiscoveringInstagram,
  instagramDiscoveryError,
  testResult,
  onDiscoverInstagram,
  onSave,
  onTestConnection,
}: InstagramFeedSettingsProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-pink-600 font-mono flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Instagram Business Auto-Poster
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Automatically publishes photos & captions to your linked Instagram Business or Creator
            account.
          </p>
        </div>
        <span className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>

      {/* Step 1: Get Access Token with Direct Links */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/80 to-rose-50/50 dark:from-pink-950/40 dark:to-rose-950/20 border border-pink-100 dark:border-pink-900/50 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-pink-900 dark:text-pink-300 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-mono">
              1
            </span>
            Choose Your Token Type & Get Meta Token
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
                    <strong>PRO: Never Expires!</strong> Instagram feed publishing runs 24/7 forever
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
          Generate your token with these required Instagram &amp; Page permissions:
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            instagram_basic
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            instagram_content_publish
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            pages_show_list
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            pages_read_engagement
          </span>
        </div>
      </div>

      {/* Step 2: Connect Instagram Business Account */}
      <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-mono">
              2
            </span>
            Connect Instagram Business Account
          </span>
          <button
            type="button"
            onClick={onDiscoverInstagram}
            disabled={isDiscoveringInstagram || isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 hover:bg-pink-100 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDiscoveringInstagram ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            🔍 Auto-Detect from Facebook Page
          </button>
        </div>

        {instagramDiscoveryError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
            {instagramDiscoveryError}
          </div>
        )}

        <div className="pt-2">
          <label
            htmlFor="ig-account-id"
            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
          >
            Instagram Business Account ID (Numeric)
          </label>
          <input
            id="ig-account-id"
            type="text"
            placeholder="e.g. 17841406751842985"
            aria-label="Instagram Business Account ID (Numeric)"
            value={instagramAccountId}
            onChange={(e) => setInstagramAccountId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-pink-500 focus:outline-none"
          />
          {discoveredInstagramAccount && (
            <p className="text-[11px] text-pink-600 dark:text-pink-400 mt-1 font-medium">
              Linked account: @{discoveredInstagramAccount.username}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Instagram Settings
          </button>
          <button
            type="button"
            onClick={onTestConnection}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-950/30 text-pink-700 dark:text-pink-400 transition-colors disabled:opacity-50 cursor-pointer"
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
