'use client';

import { useEffect } from 'react';
import { useCart } from '@/features/cart/context/cart-context';

const AUTO_DISMISS_MS = 4000;

export default function CartMergeBanner() {
  const { cartMergeNotice, clearCartMergeNotice } = useCart();

  useEffect(() => {
    if (!cartMergeNotice) return;

    const timer = window.setTimeout(() => {
      clearCartMergeNotice();
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [cartMergeNotice, clearCartMergeNotice]);

  if (!cartMergeNotice) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[9990] w-[min(92vw,28rem)] -translate-x-1/2">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/95 px-4 py-3 text-emerald-50 shadow-lg backdrop-blur-md">
        <span className="text-base leading-none" aria-hidden="true">
          ✓
        </span>
        <p className="flex-1 text-xs leading-relaxed">{cartMergeNotice}</p>
        <button
          type="button"
          onClick={clearCartMergeNotice}
          className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-emerald-200/80 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
