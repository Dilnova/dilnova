import { getRequestId, getUserId, getRequestPath, getRequestMethod } from '@/shared/security/async-context';

async function captureSentryError(error: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    const Sentry = await import('@sentry/nextjs');
    const { tags, ...extra } = context || {};
    Sentry.captureException(error, { 
      extra, 
      tags: tags as Record<string, string> 
    });
  } catch {
    // Sentry is optional; never block application flow.
  }
}

function addClientBreadcrumb(level: 'info' | 'warning' | 'error', message: string, data?: Record<string, unknown>) {
  // Only record manual breadcrumbs in the browser, Server logs are already handled by stdout drains.
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    import('@sentry/nextjs')
      .then(Sentry => {
        Sentry.addBreadcrumb({
          category: 'logger',
          message,
          level,
          data,
        });
      })
      .catch(() => {});
  }
}

function redactSensitiveString(text: string): string {
  if (!text) return text;
  // Replace email addresses with a redacted placeholder
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.replace(emailRegex, '[REDACTED_EMAIL]');
}

export function redactSensitiveData(obj: any, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return redactSensitiveString(obj);
    }
    return obj;
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, seen));
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: redactSensitiveString(obj.message),
      stack: obj.stack ? redactSensitiveString(obj.stack) : undefined,
    };
  }

  // Pre-compiled regex for performance (avoids Array.from() inside the loop)
  const sensitiveKeysRegex = /email|phone|address|password|secret|token|key|bankaccountname|bankaccountnumber|bankbranchcode|bankname|shippingaddress|shippingphone|customeremail|customername|authorization|cookie/i;

  const redacted: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const isSensitive = sensitiveKeysRegex.test(k);

    if (isSensitive) {
      redacted[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      redacted[k] = redactSensitiveData(v, seen);
    } else {
      redacted[k] = v;
    }
  }

  return redacted;
}

function sanitizeLogString(val: string | undefined | null): string {
  if (!val) return '';
  return String(val).replace(/[\r\n]/g, ' ');
}

/**
 * Structured JSON Logger for enterprise production environments.
 * Outputs raw JSON in production environments (perfect for Datadog, Axiom, Sentry, Cloudwatch)
 * and formatted human-readable logs during local development.
 */
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    const safeMessage = sanitizeLogString(message);
    const safeRequestId = sanitizeLogString(requestId);
    
    const baseContext: Record<string, any> = { userId: getUserId(), path: getRequestPath(), method: getRequestMethod(), ...context };
    Object.keys(baseContext).forEach(k => baseContext[k] === undefined && delete baseContext[k]);
    const redactedContext = Object.keys(baseContext).length > 0 ? redactSensitiveData(baseContext) : undefined;
    
    if (process.env.NODE_ENV === 'production') {
      console.log(
        JSON.stringify({
          level: 'info',
          message: safeMessage,
          requestId: safeRequestId || undefined,
          context: redactedContext,
          timestamp: new Date().toISOString(),
        })
      );
      addClientBreadcrumb('info', safeMessage, redactedContext);
    } else {
      const idPrefix = safeRequestId ? ` [${safeRequestId}]` : '';
      console.log(
        '%s %s %s',
        `[INFO]${idPrefix}`,
        safeMessage,
        redactedContext ? JSON.stringify(redactedContext, null, 2) : ''
      );
    }
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    const safeMessage = sanitizeLogString(message);
    const safeRequestId = sanitizeLogString(requestId);
    
    const baseContext: Record<string, any> = { userId: getUserId(), path: getRequestPath(), method: getRequestMethod(), ...context };
    Object.keys(baseContext).forEach(k => baseContext[k] === undefined && delete baseContext[k]);
    const redactedContext = Object.keys(baseContext).length > 0 ? redactSensitiveData(baseContext) : undefined;
    
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: safeMessage,
          requestId: safeRequestId || undefined,
          context: redactedContext,
          timestamp: new Date().toISOString(),
        })
      );
      addClientBreadcrumb('warning', safeMessage, redactedContext);
    } else {
      const idPrefix = safeRequestId ? ` [${safeRequestId}]` : '';
      console.warn(
        '%s %s %s',
        `[WARN]${idPrefix}`,
        safeMessage,
        redactedContext ? JSON.stringify(redactedContext, null, 2) : ''
      );
    }
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    const safeMessage = sanitizeLogString(message);
    const safeRequestId = sanitizeLogString(requestId);
    
    const baseContext: Record<string, any> = { userId: getUserId(), path: getRequestPath(), method: getRequestMethod(), ...context };
    Object.keys(baseContext).forEach(k => baseContext[k] === undefined && delete baseContext[k]);
    const redactedContext = Object.keys(baseContext).length > 0 ? redactSensitiveData(baseContext) : undefined;
    
    let redactedError = error;
    if (error) {
      try {
        redactedError = redactSensitiveData(error);
      } catch {
        redactedError = '[Unresolvable Error Object]';
      }
    }

    if (process.env.NODE_ENV === 'production') {
      console.error(
        JSON.stringify({
          level: 'error',
          message: safeMessage,
          requestId: safeRequestId || undefined,
          error: redactedError,
          context: redactedContext,
          timestamp: new Date().toISOString(),
        })
      );
      addClientBreadcrumb('error', safeMessage, redactedContext);
      
      const sentryErr = error instanceof Error ? error : new Error(safeMessage);
      void captureSentryError(sentryErr, {
        ...redactedContext,
        requestId: safeRequestId || undefined,
        logMessage: safeMessage,
      });
    } else {
      const idPrefix = safeRequestId ? ` [${safeRequestId}]` : '';
      console.error(
        '%s %s %s %s',
        `[ERROR]${idPrefix}`,
        safeMessage,
        redactedError ? (typeof redactedError === 'string' ? sanitizeLogString(redactedError) : JSON.stringify(redactedError, null, 2)) : '',
        redactedContext ? JSON.stringify(redactedContext, null, 2) : ''
      );
    }
  },
};

/**
 * Wraps an asynchronous operation with performance timing and a Sentry span.
 * Logs a warning if the operation takes longer than thresholdMs (default 1500ms).
 */
export async function withPerformanceTracking<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
  thresholdMs = 1500
): Promise<T> {
  const start = performance.now();

  const execute = async () => {
    try {
      const result = await fn();
      const duration = performance.now() - start;
      if (duration > thresholdMs) {
        logger.warn(`[Slow API ${duration.toFixed(2)}ms] ${name}`);
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`[API Failure ${duration.toFixed(2)}ms] ${name} failed`, error);
      throw error;
    }
  };

  if (process.env.NODE_ENV === 'production' && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
    try {
      const Sentry = await import('@sentry/nextjs');
      return await Sentry.startSpan({ name, op }, execute);
    } catch {
      return await execute();
    }
  }

  return await execute();
}
