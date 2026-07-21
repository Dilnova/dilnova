/**
 * Standardized API Error Handler
 * 
 * Safely parses, logs, and formats errors for consistent API responses and logging.
 */

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

export function handleApiError(error: unknown, defaultMessage = 'An unexpected error occurred.'): ApiErrorResponse {
  // 1. Log the error internally (can be expanded to use a real logger service)
  console.error('[API Error]', error);

  // 2. Format the response
  if (error instanceof Error) {
    // If it's a standard JS error
    return {
      message: error.message || defaultMessage,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  if (typeof error === 'object' && error !== null) {
    // Attempt to extract known properties
    const obj = error as Record<string, any>;
    return {
      message: typeof obj.message === 'string' ? obj.message : defaultMessage,
      code: typeof obj.code === 'string' ? obj.code : undefined,
      status: typeof obj.status === 'number' ? obj.status : undefined,
    };
  }

  // Fallback
  return {
    message: defaultMessage,
  };
}
