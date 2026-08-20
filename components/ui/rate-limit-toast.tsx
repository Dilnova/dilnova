"use client";

import React from "react";
import { Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

export interface RateLimitToastProps {
  toastId?: string | number;
  countdownSeconds: number;
  totalWaitSeconds: number;
  isRetrying?: boolean;
  attemptNumber?: number;
  onCancel?: () => void;
  onRetryNow?: () => void;
}

export function RateLimitToast({
  toastId,
  countdownSeconds,
  totalWaitSeconds,
  isRetrying = false,
  attemptNumber = 1,
  onCancel,
  onRetryNow,
}: RateLimitToastProps) {
  const safeTotal = Math.max(1, totalWaitSeconds);
  const elapsed = Math.max(0, safeTotal - countdownSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsed / safeTotal) * 100));

  const handleCancel = () => {
    if (toastId) toast.dismiss(toastId);
    onCancel?.();
  };

  const handleRetryNow = () => {
    onRetryNow?.();
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-slate-900/95 p-4 text-slate-100 shadow-xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isRetrying ? (
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              {isRetrying
                ? `Retrying Action (Attempt ${attemptNumber})...`
                : "Rate Limit Reached — Auto Retrying"}
            </h4>
            <p className="mt-0.5 text-xs text-slate-300">
              {isRetrying ? (
                "Connecting to server..."
              ) : (
                <>
                  System busy. Executing task automatically in{" "}
                  <span className="font-mono font-bold text-amber-300">{countdownSeconds}s</span>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleCancel}
          type="button"
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          title="Cancel automatic retry"
        >
          <XCircle className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </button>
      </div>

      {/* Progress Bar */}
      {!isRetrying && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between pt-1 text-xs">
        <button
          onClick={handleCancel}
          type="button"
          className="font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
        >
          Cancel Queue
        </button>

        {!isRetrying && onRetryNow && (
          <button
            onClick={handleRetryNow}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            <RefreshCw className="h-3 w-3" />
            Retry Now
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Utility to display or update a Sonner toast with the rate limit countdown component.
 */
export function showRateLimitToast(
  props: RateLimitToastProps,
  existingToastId?: string | number,
): string | number {
  const toastContent = (tId: string | number) => <RateLimitToast {...props} toastId={tId} />;

  if (existingToastId) {
    toast.custom(() => toastContent(existingToastId), { id: existingToastId, duration: Infinity });
    return existingToastId;
  }

  return toast.custom((tId) => toastContent(tId), { duration: Infinity });
}
