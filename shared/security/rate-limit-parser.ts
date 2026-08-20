/**
 * shared/security/rate-limit-parser.ts
 *
 * Enterprise helper for identifying rate limit errors and extracting retry-after duration.
 */

export interface ParsedRateLimit {
  isRateLimit: boolean;
  retryAfterSeconds: number;
  message: string;
}

const DEFAULT_RETRY_SECONDS = 15;

/**
 * Parses an error string, Error object, or Server Action response to detect rate-limiting
 * and extract the required wait time in seconds.
 */
export function parseRateLimitError(error: unknown): ParsedRateLimit {
  if (!error) {
    return { isRateLimit: false, retryAfterSeconds: 0, message: "" };
  }

  let message = "";
  let status: number | undefined;

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.error === "string") {
      message = obj.error;
    } else if (typeof obj.message === "string") {
      message = obj.message;
    } else if (typeof obj.serverError === "string") {
      message = obj.serverError;
    }
    if (typeof obj.status === "number") {
      status = obj.status;
    }
  }

  if (!message) {
    return { isRateLimit: false, retryAfterSeconds: 0, message: "" };
  }

  const isRateLimit = /rate limit|too many requests|429/i.test(message) || status === 429;

  if (!isRateLimit) {
    return { isRateLimit: false, retryAfterSeconds: 0, message };
  }

  // Regex matches for wait durations (e.g. "Please try again in 14 seconds.", "Retry in 14s.")
  const patterns = [
    /(?:try again in|retry in|wait)\s+(\d+)\s*(?:seconds?|s)/i,
    /(\d+)\s*(?:seconds?|s)\s*(?:remaining|left)/i,
  ];

  let retryAfterSeconds = DEFAULT_RETRY_SECONDS;

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfterSeconds = parsed;
        break;
      }
    }
  }

  return {
    isRateLimit: true,
    retryAfterSeconds,
    message,
  };
}
