"use client";

import React from "react";
import { useAddProduct } from "./AddProductContext";

export default function ProductDescriptionForm() {
  const { description, setDescription } = useAddProduct();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
      <h2 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
          2
        </span>
        Description
      </h2>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Details about product materials, sizes, or service inclusions..."
        className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 rounded-xl text-base sm:text-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-150 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all resize-y min-h-[80px]"
      />
    </div>
  );
}
