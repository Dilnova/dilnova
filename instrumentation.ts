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
        : 1.0;

      Sentry.init({
        dsn,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
        tracesSampleRate,
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
