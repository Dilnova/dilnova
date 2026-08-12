"use client";

import { useState } from "react";
import { Truck, ExternalLink, Printer, CheckCircle2, Package, Loader2 } from "lucide-react";

interface ShipmentCardProps {
  orderId: string;
  carrierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  status?: string | null;
  shippedAt?: string | Date | null;
}

export function ShipmentCard({
  orderId,
  carrierName,
  trackingNumber: initialTracking,
  trackingUrl: initialTrackingUrl,
  labelUrl: initialLabelUrl,
  status: initialStatus,
  shippedAt: initialShippedAt,
}: ShipmentCardProps) {
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl);
  const [labelUrl, setLabelUrl] = useState(initialLabelUrl);
  const [status, setStatus] = useState(initialStatus ?? "pending");
  const [shippedAt, setShippedAt] = useState(initialShippedAt);
  const [error, setError] = useState<string | null>(null);

  const isDispatched = Boolean(trackingNumber || status === "shipped");

  const handleGenerateLabel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shipping/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate label");
      }

      setTrackingNumber(data.trackingNumber);
      setTrackingUrl(data.trackingUrl);
      setLabelUrl(data.labelUrl);
      setStatus("shipped");
      setShippedAt(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Label generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Shipment & Logistics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {carrierName || "Dilnova Express Fulfillment"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDispatched ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle2 className="h-3.5 w-3.5" /> Shipped
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              <Package className="h-3.5 w-3.5" /> Awaiting Dispatch
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {isDispatched ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm">
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Carrier & Waybill (AWB)
              </span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {carrierName || "Dilnova Express"}: {trackingNumber}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Dispatched Date
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                {shippedAt ? new Date(shippedAt).toLocaleDateString() : "Recently Dispatched"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Track Shipment
              </a>
            )}
            {labelUrl ? (
              <a
                href={labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> Download Shipping Label (PDF)
              </a>
            ) : (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> Print Thermal Label (4x6)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
          <Package className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Ready for Shipment Generation
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Generate a Dilnova AWB airway bill and shipping label for this order.
          </p>
          <button
            onClick={handleGenerateLabel}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-all shadow-md hover:shadow-indigo-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating AWB Label...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4" /> Generate AWB & Dispatched Label
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
