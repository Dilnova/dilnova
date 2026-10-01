"use client";

import { Sparkles, CheckCircle, Info } from "lucide-react";

interface PlatformSetupGuideProps {
  onDismiss: () => void;
}

export function PlatformSetupGuide({ onDismiss }: PlatformSetupGuideProps) {
  return (
    <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-purple-50/60 via-indigo-50/40 to-blue-50/40 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 border border-purple-200/80 dark:border-purple-900/60 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" /> Multi-Channel Social & Search
          Architecture Guide
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss setup guide"
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium cursor-pointer"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Dilnova connects directly to official first-party APIs (Zero Third Parties). Choose the tabs
        below to configure your store&apos;s channels:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
        {/* 1. Facebook Feed */}
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-blue-100 dark:border-blue-950/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                📢 Facebook Feed
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Easy (5m)
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              Auto-posts photos, prices, and links to your Page timeline on product creation.
            </p>
            <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Zero domain verification
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> 100% Global availability
              </div>
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" /> Needs Facebook Page Admin
              </div>
            </div>
          </div>
        </div>

        {/* 2. WhatsApp Business & 1-Click */}
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                🟢 WhatsApp Business
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Official Meta
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              Links your synced Meta Catalog directly to your WhatsApp Business phone number.
            </p>
            <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> 100% Free & Zero 3rd parties
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Auto-syncs live inventory
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> 1-Click Share to WhatsApp
              </div>
            </div>
          </div>
        </div>

        {/* 3. Instagram Auto-Poster */}
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-pink-100 dark:border-pink-950/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-pink-700 dark:text-pink-400">
                📸 Instagram Feed
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Moderate (10m)
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              Publishes photo posts & captions to your Instagram Business account grid.
            </p>
            <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" /> Must be IG Business/Creator
              </div>
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" /> Must link IG to Facebook Page
              </div>
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" /> 25 posts/24h Meta rate limit
              </div>
            </div>
          </div>
        </div>

        {/* 4. Pinterest & Google SEO */}
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-red-100 dark:border-red-950/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-700 dark:text-red-400">
                📌 Pinterest & Google
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                SEO (DA 94)
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              Publishes Product Pins with Schema.org markup. Indexed by Google Search & Images.
            </p>
            <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Google Search indexing
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Live prices & in-stock badge
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> 1,000 pins/day free
              </div>
            </div>
          </div>
        </div>

        {/* 5. Meta Commerce Catalog */}
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-purple-100 dark:border-purple-950/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                🛍️ Meta Catalog
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              Syncs your full product catalog to Meta Commerce Manager for Facebook Shop and
              Instagram Tagging.
            </p>
            <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Live catalog inventory
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Powers Facebook Shop
              </div>
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" /> Needs Meta Business Manager
              </div>
            </div>
          </div>
        </div>

        {/* 6. Outbound Webhook */}
        <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-amber-100 dark:border-amber-950/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                ⚡ Webhooks (API)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Developer
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              Dispatches real-time JSON payloads on product events to your external ERP or custom
              server.
            </p>
            <div className="space-y-1 text-[10px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Real-time event notifications
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Custom ERP / CRM integration
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Secure HTTPS endpoint
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
