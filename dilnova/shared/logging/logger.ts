import { getRequestId } from '@/shared/security/async-context';

async function captureSentryError(error: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.captureException(error, { extra: context });
    } catch {
      // Sentry is optional; never block application flow.
    }
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

  const sensitiveKeys = new Set([
    'email',
    'phone',
    'address',
    'password',
    'secret',
    'token',
    'key',
    'bankaccountname',
    'bankaccountnumber',
    'bankbranchcode',
    'bankdetails',
    'bankname',
    'shippingaddress',
    'shippingphone',
    'customeremail',
    'customername',
    'authorization',
    'cookie',
  ]);

  const redacted: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lowerKey = k.toLowerCase();
    const isSensitive = Array.from(sensitiveKeys).some(
      (sk) => lowerKey === sk || lowerKey.includes(sk)
    );

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

/**
 * Structured JSON Logger for enterprise production environments.
 * Outputs raw JSON in production environments (perfect for Datadog, Axiom, Sentry, Cloudwatch)
 * and formatted human-readable logs during local development.
 */
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    const redactedContext = context ? redactSensitiveData(context) : undefined;
    if (process.env.NODE_ENV === 'production') {
      console.log(
        JSON.stringify({
          level: 'info',
          message,
          requestId,
          context: redactedContext,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      const idPrefix = requestId ? ` [${requestId}]` : '';
      console.log(`[INFO]${idPrefix} ${message}`, redactedContext ? JSON.stringify(redactedContext, null, 2) : '');
    }
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    const redactedContext = context ? redactSensitiveData(context) : undefined;
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message,
          requestId,
          context: redactedContext,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      const idPrefix = requestId ? ` [${requestId}]` : '';
      console.warn(`[WARN]${idPrefix} ${message}`, redactedContext ? JSON.stringify(redactedContext, null, 2) : '');
    }
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const requestId = getRequestId();
    const redactedContext = context ? redactSensitiveData(context) : undefined;
    
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
          message,
          requestId,
          error: redactedError,
          context: redactedContext,
          timestamp: new Date().toISOString(),
        })
      );
      
      const sentryErr = error instanceof Error ? error : new Error(message);
      void captureSentryError(sentryErr, {
        ...redactedContext,
        requestId,
        logMessage: message,
      });
    } else {
      const idPrefix = requestId ? ` [${requestId}]` : '';
      console.error(
        `[ERROR]${idPrefix} ${message}`,
        redactedError || '',
        redactedContext ? JSON.stringify(redactedContext, null, 2) : ''
      );
    }
  },
};
