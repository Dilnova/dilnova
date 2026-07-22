"use client";

import React from "react";
import { useAddProduct } from "./AddProductContext";
import CategorySelector from "@/shared/ui/CategorySelector";

export default function ProductBasicDetailsForm() {
  const {
    type,
    setType,
    name,
    setName,
    price,
    setPrice,
    categories,
    categoryId,
    setCategoryId,
    stockAvailabilityOptions,
    stockAvailability,
    setStockAvailability,
    quantity,
    setQuantity,
    isMultiBranchActive,
    stockAllocationMode,
    branches,
    selectedBranchId,
    setSelectedBranchId,
  } = useAddProduct();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-4">
      <h2 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
          1
        </span>
        Basic Details
      </h2>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setType("product")}
          className={`flex items-center justify-center gap-2 py-3.5 sm:py-2.5 rounded-xl text-sm sm:text-xs font-semibold border transition-all cursor-pointer active:scale-[0.97] ${
            type === "product"
              ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-350"
              : "bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
          }`}
        >
          🛒 Product
        </button>
        <button
          type="button"
          onClick={() => setType("service")}
          className={`flex items-center justify-center gap-2 py-3.5 sm:py-2.5 rounded-xl text-sm sm:text-xs font-semibold border transition-all cursor-pointer active:scale-[0.97] ${
            type === "service"
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-350"
              : "bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
          }`}
        >
          🛠️ Service
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Item Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Premium Garden Hose"
          required
          autoComplete="off"
          className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
        />
      </div>

      <div
        className={`grid grid-cols-1 ${
          type === "product"
            ? isMultiBranchActive &&
              stockAllocationMode === "target_branch" &&
              branches &&
              branches.length > 0
              ? "sm:grid-cols-4"
              : "sm:grid-cols-3"
            : "sm:grid-cols-2"
        } gap-3`}
      >
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Price (USD) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="29.99"
              required
              className="w-full pl-8 pr-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 font-mono transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Category
          </label>
          <CategorySelector
            categories={categories}
            selectedId={categoryId}
            onChange={setCategoryId}
          />
        </div>

        {type === "product" && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Stock Availability
              </label>
              <select
                value={stockAvailability}
                onChange={(e) => setStockAvailability(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all font-semibold"
              >
                {stockAvailabilityOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Initial Quantity
              </label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 font-mono transition-all"
              />
            </div>
          </>
        )}

        {type === "product" &&
          isMultiBranchActive &&
          stockAllocationMode === "target_branch" &&
          branches &&
          branches.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Destination Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all font-semibold"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏬 {b.name} {b.isDefault ? "(Main)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
      </div>
    </div>
  );
}
