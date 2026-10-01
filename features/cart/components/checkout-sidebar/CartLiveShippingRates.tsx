"use client";

import { Spinner } from "@/shared/ui/loading";
import type { ShippingRateItem } from "./types";

const CARRIER_META: Record<
  string,
  {
    label: string;
    badge: string;
    color: string;
    darkColor: string;
    icon: string;
  }
> = {
  slpost: {
    label: "Sri Lanka Post",
    badge: "Official",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    darkColor: "dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/40",
    icon: "🇱🇰",
  },
  shippo: {
    label: "Shippo (Multi-Carrier)",
    badge: "Live API",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    darkColor: "dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800/40",
    icon: "📦",
  },
  easypost: {
    label: "EasyPost (Multi-Carrier)",
    badge: "Live API",
    color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    darkColor: "dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-800/40",
    icon: "🚀",
  },
  builtin: {
    label: "Platform Carrier",
    badge: "Built-in",
    color: "text-zinc-700 bg-zinc-50 border-zinc-200",
    darkColor: "dark:text-zinc-400 dark:bg-zinc-900/30 dark:border-zinc-800",
    icon: "🏪",
  },
};

const ORDER = ["slpost", "shippo", "easypost", "builtin"];

interface CartLiveShippingRatesProps {
  isFetchingRates: boolean;
  shippingCity: string;
  shippingCountry: string;
  availableShippingRates: ShippingRateItem[];
  selectedRateId?: string;
  onSelectShippingRate?: (rateId: string) => void;
  formatPrice: (cents: number) => string;
}

export function CartLiveShippingRates({
  isFetchingRates,
  shippingCity,
  shippingCountry,
  availableShippingRates,
  selectedRateId,
  onSelectShippingRate,
  formatPrice,
}: CartLiveShippingRatesProps) {
  if (isFetchingRates) {
    return (
      <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 dark:bg-purple-950/20 dark:border-purple-800/30 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2.5 mt-2 animate-pulse">
        <Spinner size="sm" />
        <span>
          Calculating live shipping rates for <strong>{shippingCity || "destination"}</strong>...
        </span>
      </div>
    );
  }

  if (availableShippingRates.length > 0) {
    const grouped = new Map<string, ShippingRateItem[]>();
    for (const rate of availableShippingRates) {
      const cid =
        rate.carrierId ||
        (rate.rateId.startsWith("easypost_")
          ? "easypost"
          : rate.rateId.startsWith("shippo_")
            ? "shippo"
            : "slpost");
      const g = grouped.get(cid) ?? [];
      g.push(rate);
      grouped.set(cid, g);
    }
    const sortedGroups = [...grouped.entries()].sort(
      ([a], [b]) => (ORDER.indexOf(a) ?? 99) - (ORDER.indexOf(b) ?? 99),
    );

    return (
      <fieldset className="space-y-3 pt-2">
        <legend className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1 flex items-center justify-between">
          <span>Shipping Carrier &amp; Service</span>
          <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold">
            LIVE RATES
          </span>
        </legend>
        {sortedGroups.map(([carrierId, rates]) => {
          const meta = CARRIER_META[carrierId] ?? {
            label: carrierId,
            badge: "Carrier",
            color: "text-zinc-700 bg-zinc-50 border-zinc-200",
            darkColor: "dark:text-zinc-400 dark:bg-zinc-900/30 dark:border-zinc-800",
            icon: "🚚",
          };
          return (
            <div key={carrierId} className="space-y-1.5">
              {/* Integration header */}
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold ${meta.color} ${meta.darkColor}`}
              >
                <span>{meta.icon}</span>
                <span className="flex-1">{meta.label}</span>
                <span className="text-[9px] font-bold opacity-70">{meta.badge}</span>
              </div>
              {/* Rates under this carrier */}
              {rates.map((rate) => (
                <label
                  key={rate.rateId}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ml-1 ${
                    selectedRateId === rate.rateId
                      ? "border-purple-500/50 bg-purple-500/5"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingRate"
                    value={rate.rateId}
                    checked={selectedRateId === rate.rateId}
                    onChange={() => onSelectShippingRate?.(rate.rateId)}
                    className="mt-0.5 accent-purple-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                        {rate.serviceName}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-purple-700 dark:text-purple-300 shrink-0">
                        {formatPrice(rate.amountCents)}
                      </span>
                    </span>
                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Est. {rate.estimatedDays} {rate.estimatedDays === 1 ? "day" : "days"} · via{" "}
                      {rate.carrierName}
                    </span>
                    {rate.branchBreakdown && rate.branchBreakdown.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/40 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-800 dark:text-purple-300">
                          <span>🏬</span>
                          <span>Ships from {rate.branchBreakdown.length} locations:</span>
                        </div>
                        <div className="space-y-0.5 pl-2.5">
                          {rate.branchBreakdown.map((b, bIdx) => (
                            <div
                              key={bIdx}
                              className="flex items-center justify-between text-[10px] font-mono text-zinc-600 dark:text-zinc-400"
                            >
                              <span>
                                • {b.branchName} ({b.originCity})
                              </span>
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                {formatPrice(b.amountCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </fieldset>
    );
  }

  if (shippingCity.trim() && shippingCountry.trim()) {
    return (
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-950/30 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2 mt-2">
        <span className="text-base">⚠️</span>
        <span>
          No shipping methods available for{" "}
          <strong>
            {shippingCity}, {shippingCountry}
          </strong>
          . Please verify city name or address details.
        </span>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 dark:bg-purple-950/20 dark:border-purple-800/30 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2 mt-2">
      <span className="text-base">📍</span>
      <span>
        Enter <strong>City</strong> and select <strong>Country</strong> above to fetch live shipping
        rates &amp; carrier options.
      </span>
    </div>
  );
}
