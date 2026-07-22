"use client";

import React from "react";
import type {
  CatalogCategoryRef,
  CatalogVendorRef,
  CatalogSort,
  CatalogStockFilter,
} from "../types";

interface ActiveFilterChipsProps {
  categories: CatalogCategoryRef[];
  vendors: CatalogVendorRef[];
  currentCategory?: string;
  currentSearch?: string;
  currentType?: string;
  currentVendor?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentStock?: CatalogStockFilter;
  currentSort?: CatalogSort;
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}

export default function ActiveFilterChips({
  categories,
  vendors,
  currentCategory,
  currentSearch,
  currentType,
  currentVendor,
  currentMinPrice,
  currentMaxPrice,
  currentStock,
  currentSort,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; valueLabel: string }[] = [];

  if (currentSearch) {
    chips.push({ key: "search", label: "Search", valueLabel: `"${currentSearch}"` });
  }

  if (currentCategory) {
    const cat = categories.find((c) => c.slug === currentCategory);
    chips.push({
      key: "category",
      label: "Category",
      valueLabel: cat ? cat.name : currentCategory,
    });
  }

  if (currentType && currentType !== "all") {
    chips.push({
      key: "type",
      label: "Type",
      valueLabel: currentType === "product" ? "Products" : "Services",
    });
  }

  if (currentVendor) {
    const vendor = vendors.find((v) => v.slug === currentVendor);
    chips.push({
      key: "vendor",
      label: "Vendor",
      valueLabel: vendor ? vendor.name : currentVendor,
    });
  }

  if (currentMinPrice || currentMaxPrice) {
    let priceText = "";
    if (currentMinPrice && currentMaxPrice) {
      priceText = `$${currentMinPrice} - $${currentMaxPrice}`;
    } else if (currentMinPrice) {
      priceText = `Min $${currentMinPrice}`;
    } else if (currentMaxPrice) {
      priceText = `Max $${currentMaxPrice}`;
    }
    chips.push({ key: "price", label: "Price", valueLabel: priceText });
  }

  if (currentStock === "in_stock") {
    chips.push({ key: "stock", label: "Availability", valueLabel: "In Stock Only" });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 pb-1">
      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1">
        Active Filters:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/80 transition-colors"
        >
          <span className="text-purple-500 dark:text-purple-400 font-normal">{chip.label}:</span>
          <span className="font-semibold">{chip.valueLabel}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(chip.key)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors cursor-pointer text-purple-600 dark:text-purple-300"
            title={`Remove ${chip.label} filter`}
          >
            ✕
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-mono uppercase text-purple-700 dark:text-purple-400 hover:underline ml-2 cursor-pointer font-semibold"
      >
        Clear All
      </button>
    </div>
  );
}
