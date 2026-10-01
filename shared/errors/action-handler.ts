import { logger } from "@/shared/logging/logger";
import { ActionError } from "./action-error";
import { z } from "zod";

import {
  type ActionResponse,
  type ActionSuccess,
  type ActionFailure,
  actionSuccess,
  actionFailure,
} from "@/shared/types/action-response";
import { extractActionErrorMessage } from "./client-error";

export type { ActionResponse, ActionSuccess, ActionFailure };
export { actionSuccess, actionFailure, extractActionErrorMessage };

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
    return actionSuccess(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message || "Validation error";
      logger.warn(`[${actionName}] Validation error`, { error: error.issues });
      return actionFailure(message);
    }

    if (error instanceof ActionError) {
      logger.warn(`[${actionName}] Action error`, { error: error.message });
      return actionFailure(error.message);
    }

    if (error instanceof Error) {
      // Preserve original rate limit message with wait time (e.g., "Rate limit exceeded. Please try again in 14 seconds.")
      if (error.message.includes("Rate limit")) {
        logger.warn(`[${actionName}] Rate limit exceeded`, { error: error.message });
        return actionFailure(error.message);
      }
      logger.error(`[${actionName}] Action failed`, error);
      return actionFailure("An unexpected error occurred. Please try again.");
    }

    logger.error(`[${actionName}] Unknown error`, { error });
    return actionFailure("An unexpected error occurred.");
  }
}
