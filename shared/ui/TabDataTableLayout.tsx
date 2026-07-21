'use client';

import React from 'react';
import { PendingOverlay } from './PendingOverlay';

export interface ColumnDef<T> {
  header: string;
  className?: string;
  cell: (item: T) => React.ReactNode;
}

interface TabDataTableLayoutProps<T> {
  isPending: boolean;
  title: string;
  subtitle: string;
  buttonText?: string;
  onAddClick?: () => void;
  data: T[];
  columns: ColumnDef<T>[];
  renderMobileCard: (item: T) => React.ReactNode;
  emptyStateMessage?: string;
  modals?: React.ReactNode;
  filters?: React.ReactNode;
}

export function TabDataTableLayout<T>({
  isPending,
  title,
  subtitle,
  buttonText,
  onAddClick,
  data,
  columns,
  renderMobileCard,
  emptyStateMessage = 'No items found.',
  modals,
  filters,
}: TabDataTableLayoutProps<T>) {
  return (
    <div className="space-y-4 relative">
      <PendingOverlay isPending={isPending} />

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
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider bg-zinc-50/50 dark:bg-zinc-900/30">
                {columns.map((col, idx) => (
                  <th key={idx} className={`py-3 px-4 ${col.className || ''}`}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {data.map((item, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`py-3.5 px-4 ${col.className || ''}`}>
                      {col.cell(item)}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-zinc-400 font-mono">
                    {emptyStateMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {data.map((item, idx) => (
          <React.Fragment key={idx}>
            {renderMobileCard(item)}
          </React.Fragment>
        ))}
        {data.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-xs font-mono border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            {emptyStateMessage}
          </div>
        )}
      </div>

      {modals}
    </div>
  );
}
