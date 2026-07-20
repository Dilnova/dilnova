import { validateServerEnv } from '@/shared/env/server';
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.VERCEL_ENV === 'production') {
    const clerkKey = process.env.CLERK_SECRET_KEY || '';
    if (!clerkKey || clerkKey.startsWith('sk_test_') || clerkKey === 'sk_test_ci_dummy') {
      throw new Error('FATAL: test Clerk key detected in production environment — refusing to start.');
    }
  }

  validateServerEnv();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
