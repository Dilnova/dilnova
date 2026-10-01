"use client";

import { Sparkles, ShoppingBag, Eye, EyeOff, Zap, Loader2, Save } from "lucide-react";
import type { TestResult } from "./types";

interface MetaCatalogSettingsProps {
  isPending: boolean;
  catalogId: string;
  setCatalogId: (id: string) => void;
  accessToken: string;
  setAccessToken: (token: string) => void;
  hasExistingCatalogToken: boolean;
  showCatalogToken: boolean;
  setShowCatalogToken: (show: boolean) => void;
  testResult: TestResult | null;
  onSave: () => void;
  onTestCatalog: () => void;
}

export function MetaCatalogSettings({
  isPending,
  catalogId,
  setCatalogId,
  accessToken,
  setAccessToken,
  hasExistingCatalogToken,
  showCatalogToken,
  setShowCatalogToken,
  testResult,
  onSave,
  onTestCatalog,
}: MetaCatalogSettingsProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-300 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Enterprise Integration:</span>
          For established brands and companies with an active Meta Business Manager and Meta
          Commerce Catalog. Standard sellers do not need this—Facebook Page posting and WhatsApp
          direct messaging work independently.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600 font-mono">
            Meta Commerce Catalog &amp; Facebook Shop
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Syncs full product catalog to Meta Commerce Manager for Facebook Shop, Instagram
            Tagging, and WhatsApp Catalog.
          </p>
        </div>
        <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
          <ShoppingBag className="h-5 w-5" />
        </span>
      </div>

      <div>
        <label
          htmlFor="meta-catalog-id"
          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
        >
          Meta Catalog ID (Numeric)
        </label>
        <input
          id="meta-catalog-id"
          type="text"
          placeholder="e.g. 2187911822144469"
          aria-label="Meta Catalog ID (Numeric)"
          value={catalogId}
          onChange={(e) => setCatalogId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <span className="text-[10px] text-zinc-400 mt-1 block">
          Found in{" "}
          <a
            href="https://business.facebook.com/commerce_manager/catalogs"
            target="_blank"
            rel="noreferrer"
            className="text-purple-600 underline"
          >
            Meta Commerce Manager
          </a>{" "}
          under Catalog &rarr; Settings &rarr; Catalog ID.
        </span>
      </div>

      <div>
        <label
          htmlFor="meta-system-user-token"
          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
        >
          Meta System User Token
        </label>
        <div className="relative">
          <input
            id="meta-system-user-token"
            type={showCatalogToken ? "text" : "password"}
            placeholder={
              hasExistingCatalogToken
                ? "••••••••••••••••••••••••••••••••"
                : "Paste System User Token (EAA...)"
            }
            aria-label="Meta System User Token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowCatalogToken(!showCatalogToken)}
            aria-label={showCatalogToken ? "Hide Meta token" : "Show Meta token"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            {showCatalogToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Action Buttons for Catalog */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Catalog Settings
          </button>
          <button
            type="button"
            onClick={onTestCatalog}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 transition-colors disabled:opacity-50 cursor-pointer"
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
