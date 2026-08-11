"use client";

import React from "react";
import { useAddProduct } from "./AddProductContext";
import CategorySelector from "@/shared/ui/CategorySelector";
import { useCurrency } from "@/shared/currency/context/currency-context";
import { SUPPORTED_CURRENCIES } from "@/shared/currency/config";

export default function ProductBasicDetailsForm() {
  const { selectedCurrency } = useCurrency();
  const activeCurrencyInfo =
    SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];

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
    taxClasses,
    taxClassId,
    setTaxClassId,
    stockAvailabilityOptions,
    stockAvailability,
    setStockAvailability,
    preorderType,
    setPreorderType,
    preorderDepositAmount,
    setPreorderDepositAmount,
    preorderMaxQuantity,
    setPreorderMaxQuantity,
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
            Price ({selectedCurrency}){" "}
            {stockAvailability === "coming_soon" ? (
              <span className="text-blue-500 font-bold">🔒 Price TBA (Blocked)</span>
            ) : (
              <span className="text-rose-500">*</span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono font-bold">
              {activeCurrencyInfo.symbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={stockAvailability === "coming_soon" ? "" : price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={
                stockAvailability === "coming_soon" ? "Locked — Price To Be Announced" : "29.99"
              }
              disabled={stockAvailability === "coming_soon"}
              required={stockAvailability !== "coming_soon"}
              className={`w-full pl-8 pr-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm dark:border-zinc-800 font-mono transition-all ${
                stockAvailability === "coming_soon"
                  ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-500 cursor-not-allowed opacity-75"
                  : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400"
              }`}
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

        {taxClasses && taxClasses.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Tax Class Override
            </label>
            <select
              value={taxClassId}
              onChange={(e) => setTaxClassId(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all font-semibold"
            >
              <option value="">No Override (Inherit Category/Org or 0%)</option>
              {taxClasses.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name} ({tc.ratePercent}%)
                </option>
              ))}
            </select>
          </div>
        )}

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
                {stockAvailability === "coming_soon" ? (
                  <span className="text-blue-500 font-bold">🔒 Stock Count TBA (Blocked)</span>
                ) : stockAvailability === "out_of_stock" ? (
                  <span className="text-rose-500 font-bold">
                    🔒 Quantity (Locked — Out of Stock)
                  </span>
                ) : stockAvailability === "pre_order" ? (
                  <span className="text-amber-600 font-bold">
                    🔒 Warehouse Stock (Locked — No Stock Yet)
                  </span>
                ) : (
                  "Initial Quantity"
                )}
              </label>
              <input
                type="number"
                min={
                  stockAvailability === "in_stock" || stockAvailability === "limited_stock"
                    ? "1"
                    : "0"
                }
                step="1"
                inputMode="numeric"
                value={
                  stockAvailability === "coming_soon" ||
                  stockAvailability === "out_of_stock" ||
                  stockAvailability === "pre_order"
                    ? "0"
                    : quantity
                }
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={
                  stockAvailability === "in_stock" || stockAvailability === "limited_stock"
                    ? "1"
                    : "0"
                }
                disabled={
                  stockAvailability === "coming_soon" ||
                  stockAvailability === "out_of_stock" ||
                  stockAvailability === "pre_order"
                }
                className={`w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm dark:border-zinc-800 font-mono transition-all ${
                  stockAvailability === "coming_soon" ||
                  stockAvailability === "out_of_stock" ||
                  stockAvailability === "pre_order"
                    ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-500 cursor-not-allowed opacity-75"
                    : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400"
                }`}
              />
              {stockAvailability === "in_stock" && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  In Stock requires at least 1 unit in stock. Select Out of Stock for 0 quantity.
                </p>
              )}
              {stockAvailability === "limited_stock" && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Limited Stock requires at least 1 unit in stock.
                </p>
              )}
              {stockAvailability === "out_of_stock" && (
                <p className="text-[11px] text-rose-500">
                  Out-of-stock items start with 0 units. Update quantity later when stock arrives.
                </p>
              )}
              {stockAvailability === "pre_order" && (
                <p className="text-[11px] text-amber-600">
                  Pre-order items have no physical warehouse stock yet. Customers reserve slots;
                  stock is added when it arrives.
                </p>
              )}
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

      {type === "product" && stockAvailability === "pre_order" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-950/30 dark:border-amber-800/40 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
              Pre-Order Allocation & Item Count Settings
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Pre-Order Limit (Max Units)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={preorderMaxQuantity}
                onChange={(e) => setPreorderMaxQuantity(e.target.value)}
                placeholder="Unlimited if empty (e.g. 50)"
                className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 font-mono"
              />
              <p className="text-[11px] text-zinc-500">Max customer pre-order slots available.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Payment Model
              </label>
              <select
                value={preorderType}
                onChange={(e) =>
                  setPreorderType(e.target.value as "full_upfront" | "deposit" | "pay_later")
                }
                className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 font-semibold"
              >
                <option value="full_upfront">Full Upfront (100% Pay Now)</option>
                <option value="deposit">Deposit / Partial Payment</option>
                <option value="pay_later">Pay Later (Charge on Release)</option>
              </select>
            </div>

            {preorderType === "deposit" &&
              (() => {
                const depositNum = parseFloat(preorderDepositAmount);
                const priceNum = parseFloat(price);
                const hasDeposit = !isNaN(depositNum) && preorderDepositAmount !== "";
                const hasPrice = !isNaN(priceNum) && price !== "";
                const depositExceedsPrice = hasDeposit && hasPrice && depositNum > priceNum;
                const depositEqualsPrice = hasDeposit && hasPrice && depositNum === priceNum;
                const depositIsZero = hasDeposit && depositNum <= 0;

                return (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Deposit Amount ({selectedCurrency}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={preorderDepositAmount}
                      onChange={(e) => setPreorderDepositAmount(e.target.value)}
                      placeholder="e.g. 10.00"
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono transition-all ${
                        depositExceedsPrice || depositIsZero
                          ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-700 focus:ring-rose-500/40"
                          : depositEqualsPrice
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 focus:ring-amber-500/40"
                            : "border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150"
                      }`}
                    />
                    {/* Live validation messages */}
                    {depositIsZero && (
                      <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                        ❌ Deposit must be greater than $0.
                      </p>
                    )}
                    {depositExceedsPrice && !depositIsZero && (
                      <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                        ❌ Deposit ({depositNum.toFixed(2)}) exceeds the total price (
                        {priceNum.toFixed(2)}). Reduce the deposit.
                      </p>
                    )}
                    {depositEqualsPrice && !depositExceedsPrice && (
                      <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                        ⚠️ Deposit equals full price. Consider switching to &quot;Full Upfront&quot;
                        instead.
                      </p>
                    )}
                    {hasDeposit &&
                      hasPrice &&
                      !depositExceedsPrice &&
                      !depositEqualsPrice &&
                      !depositIsZero && (
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          ✓ Customer pays {depositNum.toFixed(2)} now,{" "}
                          {(priceNum - depositNum).toFixed(2)} balance on release.
                        </p>
                      )}
                  </div>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}
