"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/shared/currency/context/currency-context";
import { SUPPORTED_CURRENCIES } from "@/shared/currency/config";

export default function CurrencySelector() {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, []);

  const activeCurrency =
    SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200/60 dark:border-zinc-800 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        aria-label="Select Currency"
      >
        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {activeCurrency.symbol}
        </span>
        <span>{activeCurrency.code}</span>
        <svg
          className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg shadow-xl py-1.5 z-[9999] transition-all animate-in fade-in slide-in-from-top-2 duration-150 max-h-72 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Currency / මුදල් වර්ගය
          </div>
          {SUPPORTED_CURRENCIES.map((curr) => {
            const isSelected = selectedCurrency === curr.code;
            return (
              <button
                key={curr.code}
                onClick={() => {
                  setSelectedCurrency(curr.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono w-6 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {curr.symbol}
                  </span>
                  <div className="flex flex-col">
                    <span>{curr.code}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                      {curr.name}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
