import { logger } from "@/shared/logging/logger";

export const HTTP_TIMEOUT = {
  FAST: 4000, // Quick checks, turnstile, geocoding
  DEFAULT: 8000, // Standard external REST APIs (FX rates, shipping quotes)
  EXTENDED: 15000, // Large payloads, batch syncs (Meta catalog items_batch, label generation)
} as const;

export interface FetchWithTimeoutOptions extends RequestInit {
  /**
   * Timeout in milliseconds before the request is aborted.
   * Defaults to 8000ms (8 seconds).
   */
  timeoutMs?: number;
  /**
   * Next.js specific fetch extensions (e.g. revalidation tags, cache mode).
   */
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

/**
 * Standard HTTP fetch wrapper with explicit timeout enforcement.
 * Protects serverless functions and worker threads from hanging indefinitely
 * when third-party services degrade, fail, or experience network partitions.
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: FetchWithTimeoutOptions,
): Promise<Response> {
  const { timeoutMs = HTTP_TIMEOUT.DEFAULT, signal: userSignal, ...fetchOptions } = init || {};

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = userSignal
    ? typeof AbortSignal.any === "function"
      ? AbortSignal.any([userSignal, timeoutSignal])
      : userSignal
    : timeoutSignal;

  try {
    return await fetch(input, {
      ...fetchOptions,
      signal,
    });
  } catch (error: unknown) {
    const isTimeout =
      (timeoutSignal.aborted &&
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")) ||
      (error instanceof Error && error.name === "TimeoutError");

    if (isTimeout) {
      const urlStr =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const sanitizedUrl = urlStr.split("?")[0];
      logger.warn(`[HTTP Timeout] Request to ${sanitizedUrl} exceeded deadline of ${timeoutMs}ms`);
      throw new Error(`External request to ${sanitizedUrl} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
