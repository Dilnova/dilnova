"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parseRateLimitError } from "@/shared/security/rate-limit-parser";
import { showRateLimitToast } from "@/components/ui/rate-limit-toast";
import { toast } from "sonner";

export interface UseAutoRetryActionOptions<TResult> {
  maxRetries?: number;
  showToast?: boolean;
  onSuccess?: (data: TResult) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export interface UseAutoRetryActionResult<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  cancel: () => void;
  isLoading: boolean;
  isRateLimited: boolean;
  isRetrying: boolean;
  countdownSeconds: number;
  totalWaitSeconds: number;
  retryCount: number;
  statusText: string;
  getButtonLabel: (baseLabel: string) => string;
}

export function useAutoRetryAction<TArgs extends unknown[], TResult>(
  actionFn: (...args: TArgs) => Promise<TResult>,
  options: UseAutoRetryActionOptions<TResult> = {},
): UseAutoRetryActionResult<TArgs, TResult> {
  const { maxRetries = 3, showToast = false, onSuccess, onError, onCancel } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [totalWaitSeconds, setTotalWaitSeconds] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeToastIdRef = useRef<string | number | null>(null);
  const lastArgsRef = useRef<TArgs | null>(null);
  const executeRef = useRef<((...args: TArgs) => Promise<TResult | undefined>) | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    if (activeToastIdRef.current) {
      toast.dismiss(activeToastIdRef.current);
      activeToastIdRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    dismissToast();
    setIsLoading(false);
    setIsRateLimited(false);
    setIsRetrying(false);
    setCountdownSeconds(0);
    setTotalWaitSeconds(0);
    setRetryCount(0);
    lastArgsRef.current = null;
    onCancel?.();
  }, [clearTimer, dismissToast, onCancel]);

  useEffect(() => {
    return () => {
      clearTimer();
      dismissToast();
    };
  }, [clearTimer, dismissToast]);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      lastArgsRef.current = args;
      setIsLoading(true);
      setIsRetrying(true);

      try {
        const result = await actionFn(...args);

        // Check if server action returned structured error payload
        const parsed = parseRateLimitError(result);

        if (parsed.isRateLimit) {
          throw new Error(parsed.message);
        }

        // Execution succeeded cleanly
        clearTimer();
        dismissToast();
        setIsLoading(false);
        setIsRateLimited(false);
        setIsRetrying(false);
        setCountdownSeconds(0);
        setRetryCount(0);

        onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const parsed = parseRateLimitError(err);

        if (parsed.isRateLimit && retryCount < maxRetries) {
          const waitTime = parsed.retryAfterSeconds;
          const nextAttempt = retryCount + 1;

          setRetryCount(nextAttempt);
          setIsRateLimited(true);
          setIsRetrying(false);
          setTotalWaitSeconds(waitTime);
          setCountdownSeconds(waitTime);

          let currentCountdown = waitTime;

          if (showToast) {
            activeToastIdRef.current = showRateLimitToast(
              {
                countdownSeconds: currentCountdown,
                totalWaitSeconds: waitTime,
                isRetrying: false,
                attemptNumber: nextAttempt,
                onCancel: cancel,
                onRetryNow: () => {
                  clearTimer();
                  executeRef.current?.(...args);
                },
              },
              activeToastIdRef.current || undefined,
            );
          }

          clearTimer();
          timerRef.current = setInterval(() => {
            currentCountdown -= 1;
            setCountdownSeconds(currentCountdown);

            if (currentCountdown > 0) {
              if (showToast) {
                activeToastIdRef.current = showRateLimitToast(
                  {
                    countdownSeconds: currentCountdown,
                    totalWaitSeconds: waitTime,
                    isRetrying: false,
                    attemptNumber: nextAttempt,
                    onCancel: cancel,
                    onRetryNow: () => {
                      clearTimer();
                      executeRef.current?.(...args);
                    },
                  },
                  activeToastIdRef.current || undefined,
                );
              }
            } else {
              clearTimer();
              setIsRetrying(true);

              if (showToast) {
                activeToastIdRef.current = showRateLimitToast(
                  {
                    countdownSeconds: 0,
                    totalWaitSeconds: waitTime,
                    isRetrying: true,
                    attemptNumber: nextAttempt,
                    onCancel: cancel,
                  },
                  activeToastIdRef.current || undefined,
                );
              }

              // Auto-reinvoke task automatically!
              executeRef.current?.(...args);
            }
          }, 1000);

          return undefined;
        }

        // Non-rate-limit error OR max retries exceeded
        clearTimer();
        dismissToast();
        setIsLoading(false);
        setIsRateLimited(false);
        setIsRetrying(false);

        const errorMsg = parsed.message || (err instanceof Error ? err.message : "Action failed");
        if (showToast) {
          toast.error(errorMsg);
        }
        onError?.(errorMsg);
        return undefined;
      }
    },
    [
      actionFn,
      cancel,
      clearTimer,
      dismissToast,
      maxRetries,
      onError,
      onSuccess,
      retryCount,
      showToast,
    ],
  );

  useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  const statusText = isRateLimited
    ? `Processing... (Retrying in ${countdownSeconds}s)`
    : isLoading || isRetrying
      ? "Processing..."
      : "";

  const getButtonLabel = useCallback(
    (baseLabel: string) => {
      if (isRateLimited) {
        return `Processing... (Retrying in ${countdownSeconds}s)`;
      }
      if (isLoading || isRetrying) {
        return "Processing...";
      }
      return baseLabel;
    },
    [countdownSeconds, isLoading, isRateLimited, isRetrying],
  );

  return {
    execute,
    cancel,
    isLoading,
    isRateLimited,
    isRetrying,
    countdownSeconds,
    totalWaitSeconds,
    retryCount,
    statusText,
    getButtonLabel,
  };
}
