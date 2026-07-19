import { validateServerEnv } from '@/shared/env/server';
import * as Sentry from '@sentry/nextjs';

export async function register() {
  validateServerEnv();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
