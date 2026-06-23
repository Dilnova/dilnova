import { validateServerEnv } from '@/shared/env/server';

export async function register() {
  validateServerEnv();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      return;
    }

    try {
      const Sentry = await import('@sentry/node');
      const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
        ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0.1; // Reduced from 1.0 to limit volume and PII risk

      Sentry.init({
        dsn,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
        tracesSampleRate,
        beforeSend(event) {
          // Prevent PII leakage in error events
          if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
            delete event.user.name;
          }
          if (event.request?.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
          return event;
        },
        beforeSendTransaction(event) {
          // Prevent PII leakage in performance spans
          if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
            delete event.user.name;
          }
          return event;
        }
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Failed to initialize Sentry',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}
