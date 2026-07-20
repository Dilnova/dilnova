'use client';

import React from 'react';

interface TabDataTableLayoutProps {
  isPending: boolean;
  title: string;
  subtitle: string;
  buttonText?: string;
  onAddClick?: () => void;
  tableContent: React.ReactNode;
  mobileCardContent: React.ReactNode;
  modals?: React.ReactNode;
  filters?: React.ReactNode;
}

export function TabDataTableLayout({
  isPending,
  title,
  subtitle,
  buttonText,
  onAddClick,
  tableContent,
  mobileCardContent,
  modals,
  filters,
}: TabDataTableLayoutProps) {
  return (
    <div className="space-y-4 relative">
      {isPending && (
        <div className="fixed inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-5 py-3 rounded-xl shadow-2xl text-xs font-mono font-bold tracking-wider flex items-center gap-2.5">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            SAVING...
          </div>
        </div>
      )}

      {/* Header + Add button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">{title}</h2>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5 hidden sm:block">{subtitle}</p>
        </div>
        {onAddClick && buttonText && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/10 cursor-pointer active:scale-[0.97] whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{buttonText}</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {filters}

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-zinc-200 rounded-2xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {tableContent}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {mobileCardContent}
      </div>

      {modals}
    </div>
  );
}
