"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  OPEN_COOKIE_PREFERENCES_EVENT,
  getClientCookieConsent,
  setClientCookieConsent,
  type CookieConsentStatus,
} from "@/shared/cookies/consent";

interface CookieConsentProps {
  initialConsent?: string | null;
}

export default function CookieConsent({ initialConsent }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Strict GDPR compliance: Non-essential analytics cookies are OPT-IN by default.
  // Pre-ticked toggles are prohibited unless user previously explicitly consented.
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean>(() => {
    return initialConsent === "accepted";
  });

  useEffect(() => {
    // Check if consent has already been given or declined
    const current = getClientCookieConsent();
    const effectiveConsent = current ?? initialConsent;

    if (!effectiveConsent) {
      // Delay slightly for smooth fade-in entrance on first visit
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setAnalyticsConsent(effectiveConsent === "accepted");
    }
  }, [initialConsent]);

  // Listen for request to open/revisit cookie preferences from footer or policy page
  useEffect(() => {
    const handleOpenPreferences = () => {
      const current = getClientCookieConsent();
      setAnalyticsConsent(current === "accepted");
      setShowPreferences(true);
      setIsVisible(true);
    };

    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenPreferences);
    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenPreferences);
    };
  }, []);

  const saveConsent = useCallback((status: CookieConsentStatus) => {
    setClientCookieConsent(status);
    setIsVisible(false);
    setShowPreferences(false);
  }, []);

  const handleAcceptAll = () => {
    setAnalyticsConsent(true);
    saveConsent("accepted");
  };

  const handleDeclineAll = () => {
    setAnalyticsConsent(false);
    saveConsent("declined");
  };

  const handleSavePreferences = () => {
    saveConsent(analyticsConsent ? "accepted" : "declined");
  };

  const handleClose = () => {
    setIsVisible(false);
    setShowPreferences(false);
  };

  // Keyboard navigation: Escape key closes preferences modal if already consented
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        const current = getClientCookieConsent();
        if (current) {
          handleClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-md w-[calc(100%-2rem)] z-[999] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-5 md:p-6 flex flex-col gap-4 font-sans text-zinc-800 dark:text-zinc-200 animate-[slideUp_0.4s_ease-out]"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3
            id="cookie-consent-title"
            className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Cookie Preferences
          </h3>
        </div>

        {/* Close icon button when revisiting preferences */}
        {showPreferences && getClientCookieConsent() && (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close cookie preferences"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Description */}
      <div
        id="cookie-consent-description"
        className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed"
      >
        We use cookies to improve your experience, protect user sessions, and analyze site
        performance. Choose which cookies you allow us to use. Read our{" "}
        <Link href="/cookie" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Cookie Policy
        </Link>{" "}
        for details.
      </div>

      {/* Preference settings drawer */}
      {showPreferences && (
        <div className="border-t border-zinc-150 dark:border-zinc-800/80 pt-4 flex flex-col gap-4 transition-all duration-200">
          {/* Essential cookies */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                Strictly Necessary
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Required for core website features like authentication (Clerk) and your shopping
                cart. Cannot be disabled.
              </span>
            </div>
            <span className="shrink-0 text-[10px] font-bold tracking-wider font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full uppercase">
              Always Active
            </span>
          </div>

          {/* Analytics cookies */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                Performance &amp; Analytics
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Allows us to analyze page load speeds and traffic volumes (via Vercel Analytics and
                Speed Insights) to optimize site usability.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={analyticsConsent}
              onClick={() => setAnalyticsConsent(!analyticsConsent)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                analyticsConsent ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
              aria-label="Toggle performance and analytics cookies"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  analyticsConsent ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
        <button
          type="button"
          onClick={() => setShowPreferences(!showPreferences)}
          className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900/60 cursor-pointer"
        >
          {showPreferences ? "Hide Settings" : "Manage Preferences"}
        </button>

        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          {showPreferences ? (
            <>
              <button
                type="button"
                onClick={handleDeclineAll}
                className="flex-1 sm:flex-none text-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                Decline All
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="flex-1 sm:flex-none text-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-2 px-4 rounded-xl transition-all shadow-md shadow-indigo-900/10 cursor-pointer"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDeclineAll}
                className="flex-1 sm:flex-none text-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none text-center text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-2 px-4 rounded-xl transition-all shadow-md shadow-indigo-900/10 cursor-pointer"
              >
                Accept All
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
