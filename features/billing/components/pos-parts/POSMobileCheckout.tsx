'use client';

import React from 'react';
import { usePOSContext } from '../POSBillingProvider';
import POSTicketPanel from './POSTicketPanel';

export default function POSMobileCheckout() {
  const {
    totalItemCount,
    totalAmount,
    isMobileCartOpen,
    setIsMobileCartOpen,
  } = usePOSContext();

  return (
    <>
      {/* Mobile Sticky Bottom Summary Bar (< md screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 text-white p-3 border-t border-zinc-800 shadow-2xl flex items-center justify-between">
        <div>
          <p className="text-[11px] text-zinc-400 font-bold">{totalItemCount} items in ticket</p>
          <p className="text-base font-black font-mono text-emerald-400">${totalAmount.toFixed(2)}</p>
        </div>
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer flex items-center gap-1.5"
        >
          <span>Checkout Ticket</span>
          <span>→</span>
        </button>
      </div>

      {/* Mobile Checkout Drawer Sheet (Zero Outer Scroll - ONLY items scroll!) */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl p-4 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
              <span className="font-extrabold text-xs uppercase tracking-wider text-zinc-500">Checkout Ticket</span>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden pt-2">
              <POSTicketPanel isMobileSheet={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
