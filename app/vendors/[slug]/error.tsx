"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function VendorStorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VendorStorefrontError] Unhandled error loading vendor storefront:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 dark:bg-red-500/5 flex items-center justify-center animate-pulse">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.25A2.25 2.25 0 0 1 0 18.75V10.5M13.5 21h4.5m0 0H21A2.25 2.25 0 0 0 23.25 18.75V10.5"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Vendor Storefront Offline
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            We couldn&apos;t retrieve this vendor storefront right now. Please try again or check
            out our full vendor directory.
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
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg h-10 px-5 transition-colors cursor-pointer"
          >
            Reload Storefront
          </button>
          <Link
            href="/vendors"
            className="inline-flex items-center text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors h-10 px-4"
          >
            &larr; All Vendors
          </Link>
        </div>
      </div>
    </div>
  );
}
