import { getRequestId } from '@/shared/security/async-context';

/**
 * Structured JSON Logger for enterprise production environments.
 * Outputs raw JSON in production environments (perfect for Datadog, Axiom, Sentry, Cloudwatch)
 * and formatted human-readable logs during local development.
 */
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    if (process.env.NODE_ENV === 'production') {
      console.log(
        JSON.stringify({
          level: 'info',
          message,
          requestId,
          context,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      const idPrefix = requestId ? ` [${requestId}]` : '';
      console.log(`[INFO]${idPrefix} ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message,
          requestId,
          context,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      const idPrefix = requestId ? ` [${requestId}]` : '';
      console.warn(`[WARN]${idPrefix} ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;

    if (process.env.NODE_ENV === 'production') {
      console.error(
        JSON.stringify({
          level: 'error',
          message,
          requestId,
          error: errorDetails,
          context,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      const idPrefix = requestId ? ` [${requestId}]` : '';
      console.error(
        `[ERROR]${idPrefix} ${message}`,
        errorDetails || '',
        context ? JSON.stringify(context, null, 2) : ''
      );
    }
  },
};
