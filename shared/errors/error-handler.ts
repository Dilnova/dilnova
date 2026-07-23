import { logger } from "@/shared/logging/logger";

/**
 * Standardized API Error Handler
 *
 * Safely parses, logs, and formats errors for consistent API responses and logging.
 * Logs raw error details server-side via structured logger while returning sanitized
 * messages to clients to prevent leaking internal database schemas or system details.
 */

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export function handleApiError(
  error: unknown,
  defaultMessage = "An unexpected error occurred.",
): ApiErrorResponse {
  // 1. Log the error internally using structured logger (with PII redaction)
  logger.error("[API Error]", error);

  // 2. Return a safe, sanitized response to prevent leaking raw system/DB details
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      message: defaultMessage,
      code: typeof obj.code === "string" ? obj.code : undefined,
      status: typeof obj.status === "number" ? obj.status : undefined,
    };
  }

  return {
    message: defaultMessage,
  };
}
