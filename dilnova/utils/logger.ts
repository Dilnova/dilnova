/**
 * Structured JSON Logger for enterprise production environments.
 * Outputs raw JSON in production environments (perfect for Datadog, Axiom, Sentry, Cloudwatch)
 * and formatted human-readable logs during local development.
 */
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(
        JSON.stringify({
          level: 'info',
          message,
          context,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      console.log(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message,
          context,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;

    if (process.env.NODE_ENV === 'production') {
      console.error(
        JSON.stringify({
          level: 'error',
          message,
          error: errorDetails,
          context,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      console.error(
        `[ERROR] ${message}`,
        errorDetails || '',
        context ? JSON.stringify(context, null, 2) : ''
      );
    }
  },
};
