"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import type {
  ActiveTab,
  DiscoveredInstagramAccount,
  SocialTokensHealthReport,
  TokenHealthStatus,
} from "./types";

interface ChannelStatusDashboardProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  facebookPageId: string;
  autoPostFacebookFeed: boolean;
  catalogId: string;
  instagramAccountId: string;
  discoveredInstagramAccount: DiscoveredInstagramAccount | null;
  autoPostInstagramFeed: boolean;
  pinterestBoardId: string;
  pinterestBoardName: string;
  autoPostPinterest: boolean;
  autoSyncMetaCatalog: boolean;
  webhookUrl: string;
  autoTriggerWebhook: boolean;
  tokenHealthReport?: SocialTokensHealthReport | null;
  isCheckingTokenHealth?: boolean;
  isRefreshingTokens?: boolean;
  onCheckTokenHealth?: () => void;
  onRefreshToken?: () => void;
}

function getStatusDotClass(isConfigured: boolean, status?: TokenHealthStatus) {
  if (!isConfigured) return "bg-zinc-300 dark:bg-zinc-700";
  if (status === "EXPIRED" || status === "INVALID") return "bg-rose-500 animate-pulse";
  if (status === "EXPIRING_SOON") return "bg-amber-400";
  return "bg-emerald-500";
}

export function ChannelStatusDashboard({
  activeTab,
  onSelectTab,
  facebookPageId,
  autoPostFacebookFeed,
  catalogId,
  instagramAccountId,
  discoveredInstagramAccount,
  autoPostInstagramFeed,
  pinterestBoardId,
  pinterestBoardName,
  autoPostPinterest,
  autoSyncMetaCatalog,
  webhookUrl,
  autoTriggerWebhook,
  tokenHealthReport,
  isCheckingTokenHealth,
  isRefreshingTokens,
  onCheckTokenHealth,
  onRefreshToken,
}: ChannelStatusDashboardProps) {
  return (
    <div className="mb-8 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Facebook Status */}
        <button
          type="button"
          onClick={() => onSelectTab("facebook_feed")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "facebook_feed"
              ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
              📢 Facebook
            </span>
            <span
              className={`w-2 h-2 rounded-full ${getStatusDotClass(
                Boolean(facebookPageId),
                tokenHealthReport?.facebookPage?.status,
              )}`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {facebookPageId ? `Page: ${facebookPageId}` : "Not connected"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoPostFacebookFeed ? "Auto-Post: On" : "Auto-Post: Off"}
          </div>
        </button>

        {/* 2. WhatsApp Status */}
        <button
          type="button"
          onClick={() => onSelectTab("whatsapp")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "whatsapp"
              ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              💬 WhatsApp
            </span>
            <span
              className={`w-2 h-2 rounded-full ${catalogId ? "bg-emerald-500" : "bg-amber-400"}`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {catalogId ? "Catalog Ready" : "Setup Needed"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Shop & 1-Click</div>
        </button>

        {/* 3. Instagram Status */}
        <button
          type="button"
          onClick={() => onSelectTab("instagram_feed")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "instagram_feed"
              ? "bg-pink-50/90 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800 ring-2 ring-pink-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-pink-700 dark:text-pink-400 flex items-center gap-1">
              📸 Instagram
            </span>
            <span
              className={`w-2 h-2 rounded-full ${getStatusDotClass(
                Boolean(instagramAccountId),
                tokenHealthReport?.instagram?.status,
              )}`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {instagramAccountId
              ? `@${discoveredInstagramAccount?.username || "connected"}`
              : "Not connected"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoPostInstagramFeed ? "Auto-Post: On" : "Auto-Post: Off"}
          </div>
        </button>

        {/* 4. Pinterest Status (Search Engine) */}
        <button
          type="button"
          onClick={() => onSelectTab("pinterest")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "pinterest"
              ? "bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800 ring-2 ring-red-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
              📌 Pinterest
            </span>
            <span
              className={`w-2 h-2 rounded-full ${getStatusDotClass(
                Boolean(pinterestBoardId),
                tokenHealthReport?.pinterest?.status,
              )}`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {pinterestBoardName || (pinterestBoardId ? "Board Linked" : "Google Indexing")}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoPostPinterest ? "Auto-Pin: On" : "Auto-Pin: Off"}
          </div>
        </button>

        {/* 5. Meta Catalog Status (Enterprise) */}
        <button
          type="button"
          onClick={() => onSelectTab("meta_catalog")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "meta_catalog"
              ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
              🛍️ Meta Catalog
            </span>
            <span
              className={`w-2 h-2 rounded-full ${getStatusDotClass(
                Boolean(catalogId),
                tokenHealthReport?.metaCatalog?.status,
              )}`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {catalogId ? `ID: ${catalogId}` : "Enterprise (Optional)"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoSyncMetaCatalog ? "Auto-Sync: On" : "Auto-Sync: Off"}
          </div>
        </button>

        {/* 6. Custom Webhooks Status (Developer) */}
        <button
          type="button"
          onClick={() => onSelectTab("webhooks")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === "webhooks"
              ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              ⚡ Webhook API
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                webhookUrl ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          </div>
          <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {webhookUrl ? "Active Endpoint" : "Developer (Optional)"}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {autoTriggerWebhook ? "Dispatches: On" : "Dispatches: Off"}
          </div>
        </button>
      </div>

      {/* Social Token Health & Lifecycle Monitor */}
      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                tokenHealthReport?.overallStatus === "CRITICAL"
                  ? "bg-rose-400"
                  : tokenHealthReport?.overallStatus === "WARNING"
                    ? "bg-amber-400"
                    : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                tokenHealthReport?.overallStatus === "CRITICAL"
                  ? "bg-rose-500"
                  : tokenHealthReport?.overallStatus === "WARNING"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
            />
          </span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Token Lifecycle Health:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tokenHealthReport?.overallStatus === "CRITICAL"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : tokenHealthReport?.overallStatus === "WARNING"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : tokenHealthReport?.overallStatus === "HEALTHY"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {tokenHealthReport?.overallStatus === "CRITICAL"
              ? "Action Required (Expired)"
              : tokenHealthReport?.overallStatus === "WARNING"
                ? "Expiring Soon"
                : tokenHealthReport?.overallStatus === "HEALTHY"
                  ? "All Active Tokens Healthy"
                  : "Unconfigured"}
          </span>
          {tokenHealthReport?.facebookPage?.isPermanent && (
            <span className="text-[10px] text-zinc-500 hidden sm:inline">
              (Page Token: Permanent)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCheckTokenHealth && (
            <button
              type="button"
              onClick={onCheckTokenHealth}
              disabled={isCheckingTokenHealth || isRefreshingTokens}
              className="px-2.5 py-1 rounded-xl text-[11px] font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isCheckingTokenHealth && <Loader2 className="h-3 w-3 animate-spin" />}
              Check Token Health
            </button>
          )}

          {tokenHealthReport?.canAutoRefresh && onRefreshToken && (
            <button
              type="button"
              onClick={onRefreshToken}
              disabled={isCheckingTokenHealth || isRefreshingTokens}
              className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isRefreshingTokens ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Renewing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" /> 1-Click Renew Tokens
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
