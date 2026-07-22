"use client";

import React from "react";
import Link from "next/link";
import { usePOSContext } from "../POSBillingProvider";

export default function POSHeader() {
  const {
    orgName,
    data,
    selectedBranchId,
    setSelectedBranchId,
    setCart,
    isAdmin,
    toggleFullscreen,
    isFullscreen,
  } = usePOSContext();

  return (
    <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {orgName}
        </span>
        <span className="text-xs text-zinc-400 font-medium hidden sm:inline">•</span>
        <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 hidden sm:inline">
          Point of Sale Register
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Branch Selector */}
        {data.premiumStatus?.multiBranchActive ? (
          <select
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setCart([]);
            }}
            className="px-2.5 py-1 border border-zinc-200 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 font-bold focus:outline-none"
          >
            {data.branches.map((b) => (
              <option key={b.id} value={b.id}>
                🏬 {b.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hidden sm:inline">
            🏬 {data.branches.find((b) => b.id === selectedBranchId)?.name || "Main Register"}
          </span>
        )}

        {isAdmin && (
          <Link
            href="/vendor?tab=inventory"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hidden sm:inline"
          >
            Inventory
          </Link>
        )}

        <button
          onClick={toggleFullscreen}
          className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 cursor-pointer"
          title="Toggle Fullscreen POS Terminal"
        >
          {isFullscreen ? "Exit Fullscreen" : "⛶ Fullscreen"}
        </button>
      </div>
    </div>
  );
}
