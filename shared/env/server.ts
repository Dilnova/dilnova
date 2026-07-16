import { logger } from '@/shared/logging/logger';
import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);

export const productionServerEnvSchema = z.object({
  DATABASE_URL: nonEmpty,
  SENTRY_DSN: nonEmpty,
  DATABASE_POOL_SIZE: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || (/^\d+$/.test(val) && parseInt(val, 10) > 0),
      {
        message: 'DATABASE_POOL_SIZE must be a positive integer',
      }
    ),
  SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 1;
      },
      {
        message: 'SENTRY_TRACES_SAMPLE_RATE must be a float between 0 and 1',
      }
    ),
  PII_ENCRYPTION_KEY: nonEmpty,
  CLERK_SECRET_KEY: nonEmpty.refine((val) => val !== 'sk_test_ci_dummy', {
    message: 'CLERK_SECRET_KEY must not be the CI dummy key in production',
  }),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: nonEmpty,
  NEXT_PUBLIC_APP_URL: nonEmpty.url(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: nonEmpty,
  CLOUDINARY_API_KEY: nonEmpty,
  CLOUDINARY_API_SECRET: nonEmpty,
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
  UPSTASH_REDIS_REST_URL: nonEmpty.url(),
  UPSTASH_REDIS_REST_TOKEN: nonEmpty,
  HEALTH_CHECK_SECRET: nonEmpty,
  SMTP_USER: nonEmpty,
  SMTP_PASSWORD: nonEmpty,
  EMAIL_FROM_ADDRESS: nonEmpty.email(),
  EMAIL_FROM_NAME: nonEmpty,
  SUPERADMIN_USER_IDS: nonEmpty,
  CLERK_WEBHOOK_SECRET: nonEmpty,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: nonEmpty,
  TURNSTILE_SECRET_KEY: nonEmpty,
  QSTASH_TOKEN: nonEmpty,
});

export type ProductionServerEnv = z.infer<typeof productionServerEnvSchema>;

export function validateServerEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Next.js invokes instrumentation during production builds; CI uses placeholder values.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const result = productionServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    logger.error(
      JSON.stringify({
        level: 'error',
        message: 'Server environment validation failed',
        missingOrInvalid: formatted,
        timestamp: new Date().toISOString(),
      })
    );
    throw new Error('Server environment validation failed. Check Vercel environment variables.');
  }

  if (
    process.env.VERCEL_ENV === 'preview' &&
    process.env.DATABASE_URL?.includes('jnsfgoafayvlukjkqzjm')
  ) {
    logger.error(
      JSON.stringify({
        level: 'error',
        message: 'Preview deployment attempted to use production database',
        timestamp: new Date().toISOString(),
      })
    );
    throw new Error('Preview deployments must not use the production DATABASE_URL. Please configure a separate branch database URL for previews.');
  }
}
