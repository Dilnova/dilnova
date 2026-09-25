"use client";

import { MessageCircle, Smartphone, ShieldCheck, ExternalLink, RefreshCw } from "lucide-react";

interface WhatsAppSettingsProps {
  isPending: boolean;
  catalogId: string;
  onBatchCatalogSync: () => void;
}

export function WhatsAppSettings({
  isPending,
  catalogId,
  onBatchCatalogSync,
}: WhatsAppSettingsProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-600 font-mono flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp Business Storefront
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Sync your Meta Catalog to WhatsApp Business via Meta Commerce — products appear in your
            WhatsApp Business app storefront automatically.
          </p>
        </div>
        <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
          <Smartphone className="h-5 w-5" />
        </span>
      </div>

      {/* How It Works Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
            How This Works
          </span>
          <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
            This uses your <strong>Meta Commerce Catalog</strong> (configured in the Meta Catalog
            tab). When products are synced to Meta, they automatically appear in your WhatsApp
            Business app&apos;s storefront. This also generates click-to-chat{" "}
            <code className="font-mono text-[10px]">wa.me</code> share links for your products.
          </p>
        </div>
      </div>

      {/* 3-Step Interactive WhatsApp Connection Wizard */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
          Official 3-Step WhatsApp Connection Wizard
        </h3>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-mono">
                1
              </span>
              Get the Official WhatsApp Business App
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
              Free Download
            </span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Download the free <strong>WhatsApp Business app</strong> on your phone (iOS / Android)
            and register your store phone number.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-mono">
                2
              </span>
              Add Your WhatsApp Number in Meta Business Portfolio
            </span>
            <a
              href="https://business.facebook.com/settings/whatsapp-business-accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
            >
              Open Meta WhatsApp Accounts <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            In your Meta Business Portfolio, click{" "}
            <strong>Add &rarr; Connect a WhatsApp Business account</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-mono">
                3
              </span>
              Connect Your Synced Dilnova Catalog to WhatsApp
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://business.facebook.com/settings/whatsapp-business-accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
              >
                WhatsApp Connected Assets (Direct) <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://business.facebook.com/commerce_manager/catalogs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
              >
                Commerce Manager <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              Quick 3-Click Linking Guide in Meta Business Settings:
            </div>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Click the green <strong>WhatsApp Connected Assets</strong> button above.
              </li>
              <li>
                In the right panel, click <strong>Connected Assets</strong> &rarr;{" "}
                <strong>Add Assets</strong> &rarr; select <strong>Catalogs</strong>.
              </li>
              <li>
                Check <strong>Dilnova Store Catalog</strong> (ID:{" "}
                <code>{catalogId || "your-catalog-id"}</code>) &rarr; click{" "}
                <strong>Save Changes</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Live Status Box */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
            Meta Catalog Attached: {catalogId || "Not Set"}
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
              Auto-Sync Active
            </span>
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
            Whenever you create or edit products in Dilnova, your WhatsApp catalog updates
            automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onBatchCatalogSync}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Sync Catalog to WhatsApp Now
        </button>
      </div>
    </div>
  );
}
