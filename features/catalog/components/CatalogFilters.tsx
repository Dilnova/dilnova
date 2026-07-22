"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCatalogFilters } from "@/features/catalog/hooks/use-catalog-filters";
import {
  CATALOG_SORT_LABELS,
  CATALOG_SORT_VALUES,
  CATALOG_STOCK_FILTER_VALUES,
  type CatalogSort,
  type CatalogStockFilter,
  type CatalogCategoryRef,
  type CatalogVendorRef,
} from "@/features/catalog/types";
import CatalogCategoryPills from "./CatalogCategoryPills";
import ActiveFilterChips from "./ActiveFilterChips";
import FilterAccordionGroup from "./filters/FilterAccordionGroup";

interface CatalogFiltersProps {
  categories: CatalogCategoryRef[];
  vendors: CatalogVendorRef[];
  currentCategory?: string;
  currentSearch?: string;
  currentType?: string;
  currentSort?: CatalogSort;
  currentVendor?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentStock?: CatalogStockFilter;
  totalCount?: number;
  viewMode?: "grid" | "list";
}

const PRICE_PRESETS = [
  { label: "Under $25", min: "", max: "25" },
  { label: "$25 - $50", min: "25", max: "50" },
  { label: "$50 - $100", min: "50", max: "100" },
  { label: "$100+", min: "100", max: "" },
];

export default function CatalogFilters({
  categories,
  vendors,
  currentCategory,
  currentSearch = "",
  currentType = "all",
  currentSort = "newest",
  currentVendor = "",
  currentMinPrice = "",
  currentMaxPrice = "",
  currentStock = "all",
  totalCount = 0,
  viewMode = "grid",
}: CatalogFiltersProps) {
  const {
    isPending,
    searchVal,
    setSearchVal,
    minPriceVal,
    setMinPriceVal,
    maxPriceVal,
    setMaxPriceVal,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    updateParams,
    handleSearchSubmit,
    handleClearSearch,
    handlePriceSubmit,
    handleApplyPresetPrice,
    handleRemoveSingleFilter,
    clearAllFilters,
  } = useCatalogFilters();

  // Lock background scroll when mobile drawer is open & bind Escape key
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsMobileDrawerOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isMobileDrawerOpen, setIsMobileDrawerOpen]);

  // Active filter count logic
  const activeFilterCount = [
    Boolean(currentCategory),
    Boolean(currentSearch),
    currentType !== "all",
    Boolean(currentVendor),
    Boolean(currentMinPrice),
    Boolean(currentMaxPrice),
    currentStock !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 mb-6">
      {/* Top Search & Category Nav Header Bar */}
      <div className="space-y-3">
        {/* Search Bar Row */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search products, services, suppliers..."
              className="w-full bg-white dark:bg-zinc-900 text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-9 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-xs text-zinc-900 dark:text-zinc-50"
            />
            <span className="absolute left-3.5 top-3.5 text-zinc-400 text-sm">🔍</span>

            {searchVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs p-1 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-bold text-xs px-4 sm:px-6 py-3 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {isPending ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Category Pills Bar */}
        <CatalogCategoryPills
          categories={categories}
          currentCategory={currentCategory}
          onSelectCategory={(slug) => updateParams({ category: slug })}
        />
      </div>

      {/* Controls & Active Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y border-zinc-200/80 dark:border-zinc-850 py-3">
        <div className="flex items-center gap-3 justify-between sm:justify-start">
          {/* Mobile Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer min-h-[40px]"
          >
            <span>🎛️ Filter & Refine</span>
            {activeFilterCount > 0 && (
              <span className="bg-purple-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Results Count & Pending Indicator */}
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span>{" "}
            {totalCount === 1 ? "item found" : "items found"}
            {isPending && (
              <span className="ml-2 text-purple-600 dark:text-purple-400 animate-pulse">
                updating...
              </span>
            )}
          </div>
        </div>

        {/* Right Controls: Sort Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => updateParams({ view: "grid" })}
              className={`p-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="Grid View"
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              onClick={() => updateParams({ view: "list" })}
              className={`p-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              title="List View"
            >
              ≡ List
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-400 uppercase hidden sm:inline">
              Sort:
            </span>
            <select
              value={currentSort}
              onChange={(e) =>
                updateParams({ sort: e.target.value === "newest" ? null : e.target.value })
              }
              className="text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer shadow-xs font-medium min-h-[38px]"
            >
              {CATALOG_SORT_VALUES.map((sort) => (
                <option key={sort} value={sort}>
                  {CATALOG_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips
        categories={categories}
        vendors={vendors}
        currentCategory={currentCategory}
        currentSearch={currentSearch}
        currentType={currentType}
        currentVendor={currentVendor}
        currentMinPrice={currentMinPrice}
        currentMaxPrice={currentMaxPrice}
        currentStock={currentStock}
        currentSort={currentSort}
        onRemoveFilter={handleRemoveSingleFilter}
        onClearAll={clearAllFilters}
      />

      {/* Mobile Slide-Over Drawer Modal */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Slide-in Drawer Container */}
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white dark:bg-zinc-950 h-full flex flex-col shadow-2xl z-10 border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Filter Catalog
                </h2>
                {activeFilterCount > 0 && (
                  <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg font-bold cursor-pointer"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Filter Body */}
            <div className="p-4 overflow-y-auto flex-1">
              <FilterAccordionGroup
                categories={categories}
                vendors={vendors}
                currentCategory={currentCategory}
                currentType={currentType}
                currentVendor={currentVendor}
                currentMinPrice={currentMinPrice}
                currentMaxPrice={currentMaxPrice}
                currentStock={currentStock}
                isPending={isPending}
                minPriceVal={minPriceVal}
                maxPriceVal={maxPriceVal}
                setMinPriceVal={setMinPriceVal}
                setMaxPriceVal={setMaxPriceVal}
                updateParams={updateParams}
                handlePriceSubmit={handlePriceSubmit}
                handleApplyPresetPrice={handleApplyPresetPrice}
              />
            </div>

            {/* Sticky Drawer Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-3 text-xs font-mono uppercase font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 transition-colors cursor-pointer text-center"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 py-3 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-xl transition-colors cursor-pointer text-center shadow-xs"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Named export for standalone Desktop Sidebar component
export function CatalogDesktopSidebar({
  categories,
  vendors,
  currentCategory,
  currentType,
  currentVendor,
  currentMinPrice,
  currentMaxPrice,
  currentStock,
  updateParams: parentUpdateParams,
  isPending: parentIsPending,
}: Omit<CatalogFiltersProps, "totalCount" | "currentSearch" | "currentSort"> & {
  updateParams?: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localIsPending, startTransition] = useTransition();

  const isPending = parentIsPending ?? localIsPending;

  const [minPriceVal, setMinPriceVal] = useState(currentMinPrice || "");
  const [maxPriceVal, setMaxPriceVal] = useState(currentMaxPrice || "");

  const updateParams =
    parentUpdateParams ??
    ((updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === "" || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    });

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      minPrice: minPriceVal || null,
      maxPrice: maxPriceVal || null,
    });
  };

  const handleApplyPresetPrice = (min: string, max: string) => {
    setMinPriceVal(min);
    setMaxPriceVal(max);
    updateParams({
      minPrice: min || null,
      maxPrice: max || null,
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-2xl p-5 shadow-xs space-y-6 sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
        <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider font-mono">
          Filter Options
        </h2>
      </div>

      <FilterAccordionGroup
        categories={categories}
        vendors={vendors}
        currentCategory={currentCategory}
        currentType={currentType}
        currentVendor={currentVendor}
        currentMinPrice={currentMinPrice}
        currentMaxPrice={currentMaxPrice}
        currentStock={currentStock}
        isPending={isPending}
        minPriceVal={minPriceVal}
        maxPriceVal={maxPriceVal}
        setMinPriceVal={setMinPriceVal}
        setMaxPriceVal={setMaxPriceVal}
        updateParams={updateParams}
        handlePriceSubmit={handlePriceSubmit}
        handleApplyPresetPrice={handleApplyPresetPrice}
      />
    </div>
  );
}
