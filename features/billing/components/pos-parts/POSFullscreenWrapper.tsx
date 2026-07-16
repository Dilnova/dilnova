'use client';

import React, { ReactNode } from 'react';
import { usePOSContext } from '../POSBillingProvider';

export default function POSFullscreenWrapper({ children }: { children: ReactNode }) {
  const { isFullscreen } = usePOSContext();
  return (
    <div className={`transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-zinc-100 dark:bg-zinc-950 p-3 overflow-y-auto' : ''}`}>
      {children}
    </div>
  );
}
