"use client";

import type { ActiveTab, DiscoveredInstagramAccount } from "./types";

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
}: ChannelStatusDashboardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
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
            className={`w-2 h-2 rounded-full ${
              facebookPageId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
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
            className={`w-2 h-2 rounded-full ${
              instagramAccountId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
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
            className={`w-2 h-2 rounded-full ${
              pinterestBoardId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
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
            className={`w-2 h-2 rounded-full ${
              catalogId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
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
  );
}
