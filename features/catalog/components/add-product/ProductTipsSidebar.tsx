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
