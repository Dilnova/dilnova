import React from "react";
import { CATALOG_STOCK_FILTER_VALUES, type CatalogStockFilter } from "@/features/catalog/types";

interface AvailabilityFilterProps {
  currentStock?: CatalogStockFilter;
  updateParams: (updates: Record<string, string | null>) => void;
}

export default function AvailabilityFilter({
  currentStock,
  updateParams,
}: AvailabilityFilterProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
        Availability
      </label>
      <select
        value={currentStock}
        onChange={(e) => updateParams({ stock: e.target.value === "all" ? null : e.target.value })}
        className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer font-medium"
      >
        {CATALOG_STOCK_FILTER_VALUES.map((stock) => (
          <option key={stock} value={stock}>
            {stock === "all" ? "All Items (In & Out of Stock)" : "In Stock Only"}
          </option>
        ))}
      </select>
    </div>
  );
}
