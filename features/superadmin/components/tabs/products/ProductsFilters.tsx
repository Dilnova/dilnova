"use client";

import React from "react";
import type { Category } from "../ProductsTab";

interface ProductsFiltersProps {
  productSearch: string;
  setProductSearch: (val: string) => void;
  productTypeFilter: "all" | "product" | "service";
  setProductTypeFilter: (val: "all" | "product" | "service") => void;
  productCategoryFilter: string;
  setProductCategoryFilter: (val: string) => void;
  categories: Category[];
}

export function ProductsFilters({
  productSearch,
  setProductSearch,
  productTypeFilter,
  setProductTypeFilter,
  productCategoryFilter,
  setProductCategoryFilter,
  categories,
}: ProductsFiltersProps) {
  const renderCategoryOptions = (includeAllOption = false) => {
    const mainCats = categories.filter((c) => !c.parentId);
    return (
      <>
        <option value={includeAllOption ? "all" : ""}>
          {includeAllOption ? "All Categories" : "Uncategorized"}
        </option>
        {mainCats.map((main) => {
          const subs = categories.filter((c) => c.parentId === main.id);
          return (
            <optgroup key={main.id} label={main.name}>
              <option value={main.id}>{main.name} (All)</option>
              {subs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </>
    );
  };

  return (
    <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
      {/* Search */}
      <div className="flex-1 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search name, ID..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
        />
        {productSearch && (
          <button
            onClick={() => setProductSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            aria-label="Clear"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={productTypeFilter}
          onChange={(e) => setProductTypeFilter(e.target.value as "all" | "product" | "service")}
          className="px-3 py-2.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none appearance-none flex-1 sm:flex-none"
        >
          <option value="all">All Types</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
        </select>
        <select
          value={productCategoryFilter}
          onChange={(e) => setProductCategoryFilter(e.target.value)}
          className="px-3 py-2.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 focus:outline-none appearance-none flex-1 sm:flex-none"
        >
          {renderCategoryOptions(true)}
        </select>
      </div>
    </div>
  );
}
