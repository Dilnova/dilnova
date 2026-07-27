"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function ProductsCatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProductsCatalogError] Unhandled error loading catalog:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 flex items-center justify-center animate-pulse">
          <svg
            className="w-10 h-10 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Catalog Temporarily Unavailable
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            We hit an unexpected issue retrieving product listings. Please try again or head back
            home.
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
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors h-10 px-4"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
