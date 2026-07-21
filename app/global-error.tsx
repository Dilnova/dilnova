'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Global Error Boundary — catches errors in the root layout itself.
 * Must render its own <html> and <body> tags since the root layout has crashed.
 * This is the last line of defense before a blank white page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="m-0 font-sans bg-zinc-950 text-zinc-50">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-md w-full">
            {/* Error icon */}
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="#ef4444">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold mb-2">
              {typeof error?.message === 'string' && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) ? 'Check your connection' : 'Critical Error'}
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-2">
              {typeof error?.message === 'string' && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) ? 'It looks like you are offline or having network issues. Please check your connection and try again.' : 'A critical application error occurred. Please try refreshing the page.'}
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-600 font-mono mb-6">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold rounded-lg h-10 px-5 border-none cursor-pointer"
              >
                Reload Page
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center text-sm font-semibold text-zinc-400 no-underline h-10 px-4"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
