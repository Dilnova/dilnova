import { logger } from "@/shared/logging/logger";
import { ActionError } from "./action-error";
import { z } from "zod";

export type ActionResponse<T = undefined> =
  { success: true; data?: T; error: null } | { success: false; error: string; data?: null };

/**
 * Standardized error handler for Server Actions.
 * Wraps action logic in a try/catch block, handles Zod validation errors,
 * rate limit errors, and unexpected exceptions consistently.
 */
export async function withActionHandler<T>(
  actionName: string,
  fn: () => Promise<T>,
): Promise<ActionResponse<T>> {
  try {
    const data = await fn();
    return { success: true, data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message || "Validation error";
      logger.warn(`[${actionName}] Validation error`, { error: error.issues });
      return { success: false, error: message };
    }

    if (error instanceof ActionError) {
      logger.warn(`[${actionName}] Action error`, { error: error.message });
      return { success: false, error: error.message };
    }

    if (error instanceof Error) {
      // Preserve original rate limit message with wait time (e.g., "Rate limit exceeded. Please try again in 14 seconds.")
      if (error.message.includes("Rate limit")) {
        logger.warn(`[${actionName}] Rate limit exceeded`, { error: error.message });
        return { success: false, error: error.message };
      }
      logger.error(`[${actionName}] Action failed`, error);
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }

    logger.error(`[${actionName}] Unknown error`, { error });
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Extracts a clear, human-readable error message from next-safe-action responses,
 * including Zod field validation errors, server errors, and custom ActionErrors.
 */
export function extractActionErrorMessage(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "An unexpected error occurred. Please try again.";
  }

  const res = result as {
    data?: { error?: unknown };
    serverError?: unknown;
    validationErrors?: Record<string, { _errors?: string[] }>;
  };

  // 1. Check custom action error payload
  if (res.data && typeof res.data === "object" && "error" in res.data) {
    if (typeof res.data.error === "string" && res.data.error.trim().length > 0) {
      return res.data.error;
    }
  }

  // 2. Check next-safe-action serverError
  if (typeof res.serverError === "string" && res.serverError.trim().length > 0) {
    return res.serverError;
  }

  // 3. Check next-safe-action validationErrors (Zod field errors)
  if (res.validationErrors && typeof res.validationErrors === "object") {
    const valErrs = res.validationErrors;
    const messages: string[] = [];
    for (const key of Object.keys(valErrs)) {
      const field = valErrs[key];
      if (field?._errors && Array.isArray(field._errors) && field._errors.length > 0) {
        const fieldName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        messages.push(`${fieldName}: ${field._errors.join(", ")}`);
      }
    }
    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return "An unexpected error occurred. Please try again.";
}
