"use client";

import { Sparkles, Loader2, Save } from "lucide-react";

interface PostTemplatesSettingsProps {
  isPending: boolean;
  brandName: string;
  setBrandName: (name: string) => void;
  customPostTemplate: string;
  setCustomPostTemplate: (template: string) => void;
  onSave: () => void;
}

export function PostTemplatesSettings({
  isPending,
  brandName,
  setBrandName,
  customPostTemplate,
  setCustomPostTemplate,
  onSave,
}: PostTemplatesSettingsProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 font-mono flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Brand &amp; Post Caption Templates
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Customize how your products appear across automated Facebook posts, Instagram captions,
            and WhatsApp messages.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="social-brand-name"
          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
        >
          Store / Brand Display Name
        </label>
        <input
          id="social-brand-name"
          type="text"
          placeholder="e.g. Dilstar Hardware or My Store"
          aria-label="Store / Brand Display Name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <span className="text-[10px] text-zinc-400 mt-1 block">
          Used in caption footers, hashtags, and social attribution.
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="custom-post-template"
            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block"
          >
            Custom Post Caption Template
          </label>
          <span className="text-[10px] text-zinc-400">
            Supports &#123;title&#125;, &#123;price&#125;, &#123;link&#125;, &#123;brand&#125;
          </span>
        </div>
        <textarea
          id="custom-post-template"
          rows={4}
          placeholder={`✨ New Arrival: {title}!\n\n🏷️ Price: {price}\n🛒 Order online: {link}\n\n#{brand} #ShopOnline`}
          aria-label="Custom Post Caption Template"
          value={customPostTemplate}
          onChange={(e) => setCustomPostTemplate(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
        />
      </div>

      {/* Live Preview */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
          Live Caption Preview
        </span>
        <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
          {(
            customPostTemplate ||
            "✨ New Arrival: {title}!\n\n🏷️ Price: {price}\n🛒 Order online: {link}\n\n#{brand} #ShopOnline"
          )
            .replace(/\{title\}/g, "Premium Organic Fertilizer (5kg)")
            .replace(/\{price\}/g, "Rs. 2,450.00")
            .replace(/\{link\}/g, "https://dilnova.pp.ua/products/demo-123")
            .replace(/\{brand\}/g, (brandName || "Dilstar").replace(/\s+/g, ""))}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Template Settings
        </button>
      </div>
    </div>
  );
}
