import React from 'react';
import { Spinner } from './Spinner';

interface SavingOverlayProps {
  visible: boolean;
  message?: string;
}

export function SavingOverlay({ visible, message = 'SAVING...' }: SavingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center z-[100] pointer-events-none">
      <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-5 py-3 rounded-xl shadow-2xl text-xs font-mono font-bold tracking-wider flex items-center gap-2.5">
        <Spinner size="sm" />
        {message}
      </div>
    </div>
  );
}
