import React from "react";

interface PriceFilterProps {
  currentMinPrice?: string;
  currentMaxPrice?: string;
  minPriceVal: string;
  maxPriceVal: string;
  setMinPriceVal: (v: string) => void;
  setMaxPriceVal: (v: string) => void;
  updateParams: (updates: Record<string, string | null>) => void;
  handlePriceSubmit: (e: React.FormEvent) => void;
  handleApplyPresetPrice: (min: string, max: string) => void;
  isPending: boolean;
}

const PRICE_PRESETS = [
  { label: "Under $25", min: "", max: "25" },
  { label: "$25 - $50", min: "25", max: "50" },
  { label: "$50 - $100", min: "50", max: "100" },
  { label: "$100+", min: "100", max: "" },
];

export default function PriceFilter({
  currentMinPrice,
  currentMaxPrice,
  minPriceVal,
  maxPriceVal,
  setMinPriceVal,
  setMaxPriceVal,
  updateParams,
  handlePriceSubmit,
  handleApplyPresetPrice,
  isPending,
}: PriceFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
          Price Range ($)
        </label>
        {(currentMinPrice || currentMaxPrice) && (
          <button
            type="button"
            onClick={() => {
              setMinPriceVal("");
              setMaxPriceVal("");
              updateParams({ minPrice: null, maxPrice: null });
            }}
            className="text-[10px] font-mono text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRICE_PRESETS.map((preset) => {
          const isPresetActive = currentMinPrice === preset.min && currentMaxPrice === preset.max;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPresetPrice(preset.min, preset.max)}
              className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isPresetActive
                  ? "bg-purple-600 text-white border-purple-600 dark:bg-purple-500 dark:border-purple-500 font-semibold"
                  : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handlePriceSubmit} className="space-y-2 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
              Min ($)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPriceVal}
              onChange={(e) => setMinPriceVal(e.target.value)}
              placeholder="0"
              className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
              Max ($)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPriceVal}
              onChange={(e) => setMaxPriceVal(e.target.value)}
              placeholder="Any"
              className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        >
          Apply Price Filter
        </button>
      </form>
    </div>
  );
}
