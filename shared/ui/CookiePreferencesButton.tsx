"use client";

import { openCookiePreferences } from "@/shared/cookies/consent";

interface CookiePreferencesButtonProps {
  variant?: "link" | "button";
  className?: string;
  children?: React.ReactNode;
}

export default function CookiePreferencesButton({
  variant = "link",
  className = "",
  children,
}: CookiePreferencesButtonProps) {
  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={openCookiePreferences}
        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${className}`}
      >
        <svg
          className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        {children || "Manage Cookie Preferences"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className={`text-left hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer ${className}`}
    >
      {children || "Cookie Settings"}
    </button>
  );
}
