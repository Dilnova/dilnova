import { logger } from "@/shared/logging/logger";
import { ActionError } from "@/lib/safe-action";
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
      // Normalize common errors like rate limits
      if (error.message.includes("Rate limit")) {
        logger.warn(`[${actionName}] Rate limit exceeded`, { error: error.message });
        return { success: false, error: "Too many requests. Please try again later." };
      }
      logger.error(`[${actionName}] Action failed`, error);
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }

    logger.error(`[${actionName}] Unknown error`, { error });
    return { success: false, error: "An unexpected error occurred." };
  }
}
