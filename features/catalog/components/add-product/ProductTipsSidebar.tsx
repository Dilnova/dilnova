"use client";

import React, { useState } from "react";
import { useAddProduct } from "./AddProductContext";

export default function ProductTipsSidebar() {
  const { maxMediaLimit } = useAddProduct();
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="lg:col-span-2 space-y-3">
      <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer sm:cursor-default text-left"
        >
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
            <span>💡</span> Tips for Great Listings
          </h3>
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 sm:hidden ${showTips ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`px-4 sm:px-5 pb-4 sm:pb-5 ${showTips ? "block" : "hidden sm:block"}`}>
          <ul className="space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Use clear, descriptive names that customers will search for.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Add multiple media files — the first one becomes the primary thumbnail.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Write detailed descriptions including materials, sizes, and key features.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Select the most specific category to help customers find your items.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5">•</span>
              <span>Keep images under 10MB and use high-quality photos with good lighting.</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-purple-950/20 dark:border-purple-800/30">
        <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-1.5">
          <span>⚙️</span> Default Fallback Values
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2.5">
          Mandatory: <strong className="text-purple-600 dark:text-purple-400">Name</strong> &{" "}
          <strong className="text-purple-600 dark:text-purple-400">Price</strong>. If optional
          fields are left empty, the system uses these defaults:
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-purple-200/50 dark:border-purple-800/30">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Item Weight</span>
            <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
              100g (0.1kg)
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-purple-200/50 dark:border-purple-800/30">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Availability</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              In Stock
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-purple-200/50 dark:border-purple-800/30">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Initial Quantity</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              3 units
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-purple-200/50 dark:border-purple-800/30">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Low Stock Limit</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              5 units
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-purple-200/50 dark:border-purple-800/30">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Shipping Class</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              Standard Inland
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Pre-Order Model</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              100% Full Upfront
            </span>
          </div>
        </div>
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-900/40 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
          <span>📊</span> Upload Limits
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <span className="text-zinc-500 dark:text-zinc-400">Max media per item</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              {maxMediaLimit}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <span className="text-zinc-500 dark:text-zinc-400">Max file size</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">10 MB</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-500 dark:text-zinc-400">Accepted formats</span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              PNG, JPG, WEBP, MP4
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
