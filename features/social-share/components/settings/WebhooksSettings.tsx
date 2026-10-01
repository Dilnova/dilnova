"use client";

import { Sparkles, Send, Zap, Loader2, Save } from "lucide-react";
import type { TestResult } from "./types";

interface WebhooksSettingsProps {
  isPending: boolean;
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  testResult: TestResult | null;
  onSave: () => void;
  onTestWebhook: () => void;
}

export function WebhooksSettings({
  isPending,
  webhookUrl,
  setWebhookUrl,
  testResult,
  onSave,
  onTestWebhook,
}: WebhooksSettingsProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Developer &amp; ERP Integration:</span>
          Dispatches real-time JSON payloads on catalog events to your external server, custom ERP,
          or inventory system. Standard sellers can safely leave this blank.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 font-mono">
            Outbound Webhook (Developer API)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Optional custom HTTP webhook listener for developers.
          </p>
        </div>
        <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
          <Send className="h-5 w-5" />
        </span>
      </div>

      <div>
        <label
          htmlFor="social-webhook-url"
          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
        >
          Webhook Endpoint URL (HTTPS)
        </label>
        <input
          id="social-webhook-url"
          type="url"
          placeholder="https://your-custom-domain.com/api/webhooks"
          aria-label="Webhook Endpoint URL (HTTPS)"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Webhook Settings
          </button>
          <button
            type="button"
            onClick={onTestWebhook}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" /> Ping Test
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
