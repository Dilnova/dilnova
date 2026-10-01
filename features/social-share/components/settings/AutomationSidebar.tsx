"use client";

import { Pin, Share2, ShoppingBag, Sparkles, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { ToggleSwitch } from "./ToggleSwitch";
import type { ActiveTab, BatchSyncResult } from "./types";

interface AutomationSidebarProps {
  activeTab: ActiveTab;
  isPending: boolean;
  autoPostFacebookFeed: boolean;
  setAutoPostFacebookFeed: (v: boolean) => void;
  autoSyncMetaCatalog: boolean;
  setAutoSyncMetaCatalog: (v: boolean) => void;
  autoPostInstagramFeed: boolean;
  setAutoPostInstagramFeed: (v: boolean) => void;
  autoPostPinterest: boolean;
  setAutoPostPinterest: (v: boolean) => void;
  autoTriggerWebhook: boolean;
  setAutoTriggerWebhook: (v: boolean) => void;
  // Pinterest batch
  isBulkPostingPinterest: boolean;
  forceRepostPinterest: boolean;
  setForceRepostPinterest: (v: boolean) => void;
  batchPinterestResult: BatchSyncResult | null;
  onBatchPinterestPublish: () => void;
  // Facebook feed batch
  isBulkPostingFeed: boolean;
  forceRepostFeed: boolean;
  setForceRepostFeed: (v: boolean) => void;
  batchFeedResult: BatchSyncResult | null;
  onBatchFacebookFeedPublish: () => void;
  // Meta catalog batch
  batchSyncResult: { total: number; success: number; failed: number } | null;
  onBatchCatalogSync: () => void;
  // Instagram feed batch
  isBulkPostingInstagram: boolean;
  forceRepostInstagram: boolean;
  setForceRepostInstagram: (v: boolean) => void;
  batchInstagramResult: BatchSyncResult | null;
  onBatchInstagramFeedPublish: () => void;
}

export function AutomationSidebar({
  activeTab,
  isPending,
  autoPostFacebookFeed,
  setAutoPostFacebookFeed,
  autoSyncMetaCatalog,
  setAutoSyncMetaCatalog,
  autoPostInstagramFeed,
  setAutoPostInstagramFeed,
  autoPostPinterest,
  setAutoPostPinterest,
  autoTriggerWebhook,
  setAutoTriggerWebhook,
  isBulkPostingPinterest,
  forceRepostPinterest,
  setForceRepostPinterest,
  batchPinterestResult,
  onBatchPinterestPublish,
  isBulkPostingFeed,
  forceRepostFeed,
  setForceRepostFeed,
  batchFeedResult,
  onBatchFacebookFeedPublish,
  batchSyncResult,
  onBatchCatalogSync,
  isBulkPostingInstagram,
  forceRepostInstagram,
  setForceRepostInstagram,
  batchInstagramResult,
  onBatchInstagramFeedPublish,
}: AutomationSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Master Automation Rules */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-4 flex items-center justify-between">
          <span>Automatic Triggers</span>
          <span className="text-[10px] text-purple-600 font-semibold">Live Events</span>
        </h2>

        <div className="space-y-3.5">
          {/* Facebook Auto-Post Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                Facebook Page Feed
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Post to timeline on create
              </span>
            </div>
            <ToggleSwitch
              checked={autoPostFacebookFeed}
              onChange={setAutoPostFacebookFeed}
              ariaLabel="Toggle Facebook Page Feed auto-posting"
              color="blue"
            />
          </div>

          {/* WhatsApp & Meta Catalog Auto-Sync Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                WhatsApp &amp; Meta Catalog
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Real-time catalog sync
              </span>
            </div>
            <ToggleSwitch
              checked={autoSyncMetaCatalog}
              onChange={setAutoSyncMetaCatalog}
              ariaLabel="Toggle WhatsApp and Meta Catalog auto-sync"
              color="emerald"
            />
          </div>

          {/* Instagram Auto-Post Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                Instagram Grid Feed
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Post photo to IG grid
              </span>
            </div>
            <ToggleSwitch
              checked={autoPostInstagramFeed}
              onChange={setAutoPostInstagramFeed}
              ariaLabel="Toggle Instagram Grid Feed auto-posting"
              color="pink"
            />
          </div>

          {/* 📌 Pinterest Auto-Post Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                📌 Pinterest Product Pins
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Auto-pin for Google Indexing
              </span>
            </div>
            <ToggleSwitch
              checked={autoPostPinterest}
              onChange={setAutoPostPinterest}
              ariaLabel="Toggle Pinterest Product Pins auto-pinning"
              color="red"
            />
          </div>

          {/* Outbound Webhook Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                Outbound Webhook
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Send JSON to custom server
              </span>
            </div>
            <ToggleSwitch
              checked={autoTriggerWebhook}
              onChange={setAutoTriggerWebhook}
              ariaLabel="Toggle outbound webhook dispatch"
              color="amber"
            />
          </div>
        </div>
      </div>

      {/* Contextual Action Card: Pinterest */}
      {activeTab === "pinterest" && (
        <div className="bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/40 dark:to-amber-950/40 border border-red-200/70 dark:border-red-900/50 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 dark:text-red-300 font-mono flex items-center gap-1.5">
            <Pin className="h-4 w-4 text-red-600" /> Bulk Pinterest Pin Sync
          </h3>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Publish all active catalog products as Product Pins to your Pinterest board for search
            engine indexing.
          </p>
          <button
            type="button"
            onClick={onBatchPinterestPublish}
            disabled={isPending || isBulkPostingPinterest}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {isBulkPostingPinterest ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Publishing Pins...
              </>
            ) : (
              <>
                <Pin className="h-4 w-4" /> Bulk Sync to Pinterest Board
              </>
            )}
          </button>

          <label
            htmlFor="force-repost-pinterest"
            className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pt-1"
          >
            <input
              id="force-repost-pinterest"
              type="checkbox"
              checked={forceRepostPinterest}
              onChange={(e) => setForceRepostPinterest(e.target.checked)}
              aria-label="Force repost existing products to Pinterest"
              className="rounded border-zinc-300 text-red-600"
            />
            Force repost existing products
          </label>

          {batchPinterestResult && (
            <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-red-100 dark:border-zinc-800 space-y-1">
              <div className="text-emerald-600 font-bold">
                ✓ {batchPinterestResult.success} Pinned
              </div>
              {batchPinterestResult.skipped > 0 && (
                <div className="text-amber-600">
                  ⏭️ {batchPinterestResult.skipped} Skipped (Already Pinned)
                </div>
              )}
              {batchPinterestResult.failed > 0 && (
                <div className="text-rose-600">✗ {batchPinterestResult.failed} Failed</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contextual Action Card: Facebook */}
      {activeTab === "facebook_feed" && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 font-mono flex items-center gap-1.5">
            <Share2 className="h-4 w-4 text-blue-600" /> Bulk Facebook Page Sync
          </h3>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Publish photos and promotional captions for all active catalog products to your Facebook
            Page timeline.
          </p>
          <button
            type="button"
            onClick={onBatchFacebookFeedPublish}
            disabled={isPending || isBulkPostingFeed}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {isBulkPostingFeed ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Publishing to Facebook...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Bulk Post All to Facebook Page
              </>
            )}
          </button>

          <label
            htmlFor="force-repost-feed"
            className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pt-1"
          >
            <input
              id="force-repost-feed"
              type="checkbox"
              checked={forceRepostFeed}
              onChange={(e) => setForceRepostFeed(e.target.checked)}
              aria-label="Force repost existing products to Facebook Feed"
              className="rounded border-zinc-300 text-blue-600"
            />
            Force repost existing products
          </label>

          {batchFeedResult && (
            <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-blue-100 dark:border-zinc-800 space-y-1">
              <div className="text-emerald-600 font-bold">
                ✓ {batchFeedResult.success} Published
              </div>
              {batchFeedResult.skipped > 0 && (
                <div className="text-amber-600">
                  ⏭️ {batchFeedResult.skipped} Skipped (No media)
                </div>
              )}
              {batchFeedResult.failed > 0 && (
                <div className="text-rose-600">✗ {batchFeedResult.failed} Failed</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contextual Action Card: WhatsApp / Catalog */}
      {(activeTab === "whatsapp" || activeTab === "meta_catalog") && (
        <div className="bg-gradient-to-br from-emerald-50 to-purple-50 dark:from-emerald-950/40 dark:to-purple-950/40 border border-emerald-200/70 dark:border-purple-900/50 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 font-mono flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-emerald-600" /> WhatsApp &amp; Catalog Sync
          </h3>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Upload your entire active catalog to Meta Commerce Manager. Automatically updates
            products across Facebook Shop and WhatsApp Business.
          </p>
          <button
            type="button"
            onClick={onBatchCatalogSync}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading Batch...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" /> Push All Products to Meta &amp; WhatsApp
              </>
            )}
          </button>

          {batchSyncResult && (
            <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-emerald-100 dark:border-zinc-800 space-y-1">
              <div className="text-emerald-600 font-bold">
                ✓ {batchSyncResult.success} Products Synced
              </div>
              {batchSyncResult.failed > 0 && (
                <div className="text-rose-600">✗ {batchSyncResult.failed} Failed</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contextual Action Card: Instagram */}
      {activeTab === "instagram_feed" && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/40 dark:to-purple-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pink-900 dark:text-pink-300 font-mono flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-pink-600" /> Bulk Instagram Feed Sync
          </h3>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Publish photos and descriptions for all active products to your Instagram Business feed
            grid.
          </p>
          <button
            type="button"
            onClick={onBatchInstagramFeedPublish}
            disabled={isPending || isBulkPostingInstagram}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {isBulkPostingInstagram ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Syncing Instagram...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Bulk Sync to Instagram Grid
              </>
            )}
          </button>

          <label
            htmlFor="force-repost-instagram"
            className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pt-1"
          >
            <input
              id="force-repost-instagram"
              type="checkbox"
              checked={forceRepostInstagram}
              onChange={(e) => setForceRepostInstagram(e.target.checked)}
              aria-label="Force repost existing products to Instagram Grid"
              className="rounded border-zinc-300 text-pink-600"
            />
            Force repost existing products
          </label>

          {batchInstagramResult && (
            <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 text-xs border border-pink-100 dark:border-zinc-800 space-y-1">
              <div className="text-emerald-600 font-bold">
                ✓ {batchInstagramResult.success} Published
              </div>
              {batchInstagramResult.skipped > 0 && (
                <div className="text-amber-600">
                  ⏭️ {batchInstagramResult.skipped} Skipped (No media)
                </div>
              )}
              {batchInstagramResult.failed > 0 && (
                <div className="text-rose-600">✗ {batchInstagramResult.failed} Failed</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zero Third Parties Guarantee Card */}
      <div className="p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
        <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Direct First-Party Architecture
        </span>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Dilnova connects directly to official APIs (Meta Graph API <code>v21.0</code> and
          Pinterest API <code>v5</code>). Your credentials and product data never touch third-party
          servers.
        </p>
      </div>
    </div>
  );
}
