'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/shared/logging/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to your structured logger / error reporting service
    logger.error('[ErrorBoundary] React error boundary caught exception', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md space-y-6">
        {/* Animated error icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 dark:bg-red-500/5 flex items-center justify-center animate-pulse">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Something went wrong
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-lg h-10 px-5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Try Again
          </button>
          <Link
            href="/customer"
            className="inline-flex items-center text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors h-10 px-4"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
