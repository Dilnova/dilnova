import { logger } from "@/shared/logging/logger";
import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

/**
 * Zod schema defining all server-side and runtime environment variables required
 * for production operation. Enforces strong types, valid URLs, email formats,
 * positive integers, and cryptographic secrets at boot time.
 */
export const productionServerEnvSchema = z.object({
  // Core Database
  DATABASE_URL: nonEmpty,
  MIGRATION_DATABASE_URL: z.string().trim().optional(),
  DATABASE_POOL_SIZE: z
    .string()
    .optional()
    .refine((val) => val === undefined || (/^\d+$/.test(val) && parseInt(val, 10) > 0), {
      message: "DATABASE_POOL_SIZE must be a positive integer",
    }),

  // PII Encryption
  PII_ENCRYPTION_KEY: nonEmpty,

  // Clerk Authentication
  CLERK_SECRET_KEY: nonEmpty.refine((val) => val !== "sk_test_ci_dummy", {
    message: "CLERK_SECRET_KEY must not be the CI dummy key in production",
  }),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: nonEmpty,
  CLERK_WEBHOOK_SECRET: nonEmpty,

  // Application & Public Routing
  NEXT_PUBLIC_APP_URL: nonEmpty.url(),

  // Cloudinary Media
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: nonEmpty,
  CLOUDINARY_API_KEY: nonEmpty,
  CLOUDINARY_API_SECRET: nonEmpty,

  // Supabase Storage & Database
  NEXT_PUBLIC_SUPABASE_URL: nonEmpty.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,

  // Upstash Redis (Rate Limiting)
  UPSTASH_REDIS_REST_URL: nonEmpty.url(),
  UPSTASH_REDIS_REST_TOKEN: nonEmpty,

  // Upstash QStash (Async Jobs & Webhook Signatures)
  QSTASH_TOKEN: nonEmpty,
  QSTASH_CURRENT_SIGNING_KEY: nonEmpty,
  QSTASH_NEXT_SIGNING_KEY: nonEmpty,

  // Platform Security & Health
  HEALTH_CHECK_SECRET: nonEmpty,
  CRON_SECRET: nonEmpty,
  SUPERADMIN_USER_IDS: nonEmpty,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: nonEmpty,
  TURNSTILE_SECRET_KEY: nonEmpty,

  // SMTP Email
  SMTP_USER: nonEmpty,
  SMTP_PASSWORD: nonEmpty,
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .refine((val) => val === undefined || (/^\d+$/.test(val) && parseInt(val, 10) > 0), {
      message: "SMTP_PORT must be a positive integer",
    }),
  EMAIL_FROM_ADDRESS: nonEmpty.email(),
  EMAIL_FROM_NAME: nonEmpty,

  // Observability & Sentry
  SENTRY_DSN: nonEmpty,
  NEXT_PUBLIC_SENTRY_DSN: z.string().trim().optional(),
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
        message: "SENTRY_TRACES_SAMPLE_RATE must be a float between 0 and 1",
      },
    ),

  // Public domain verification tokens (optional)
  PINTEREST_DOMAIN_VERIFY: z.string().trim().optional(),
  FACEBOOK_DOMAIN_VERIFY: z.string().trim().optional(),
  GOOGLE_SITE_VERIFY: z.string().trim().optional(),

  // Shipping Providers & Defaults (optional)
  SHIPPING_DEFAULT_CARRIER: z.string().trim().optional(),
  SHIPPING_ORIGIN_COUNTRY: z.string().trim().length(2).optional(),
  SHIPPO_API_KEY: z.string().trim().optional(),
  EASYPOST_API_KEY: z.string().trim().optional(),
  USD_TO_LKR_RATE: z
    .string()
    .trim()
    .optional()
    .refine((val) => val === undefined || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: "USD_TO_LKR_RATE must be a positive number",
    }),

  // Security & Flags
  PII_ENCRYPTION_KEY_V1: z.string().trim().optional(),
  STRICT_CSP: z.string().trim().optional(),
  CSP_STRICT: z.string().trim().optional(),

  // Database
  DATABASE_SSL: z.string().trim().optional(),

  // Platform
  PREVIEW_CLERK_WEBHOOK_SECRET: z.string().trim().optional(),
  VERCEL_AUTOMATION_BYPASS_SECRET: z.string().trim().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().trim().optional(),
});

export type ProductionServerEnv = z.infer<typeof productionServerEnvSchema>;

/**
 * Structured, strongly typed configuration interface representing the centralized
 * environment configuration of the application.
 */
export interface ServerConfig {
  app: {
    url: string;
    name: string;
    nodeEnv: string;
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    isVercel: boolean;
    vercelEnv?: string;
    vercelUrl?: string;
    automationBypassSecret?: string;
  };
  database: {
    url: string;
    poolSize?: number;
    migrationUrl?: string;
    ssl: boolean;
    isServerless: boolean;
  };
  auth: {
    clerkSecretKey: string;
    clerkPublishableKey: string;
    clerkWebhookSecret: string;
    previewClerkWebhookSecret?: string;
    superadminUserIds: string[];
  };
  storage: {
    supabaseUrl: string;
    supabasePublishableKey: string;
    supabaseServiceRoleKey: string;
  };
  media: {
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
  };
  upstash: {
    redisUrl?: string;
    redisToken?: string;
    qstashToken?: string;
    qstashCurrentSigningKey?: string;
    qstashNextSigningKey?: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser?: string;
    smtpPassword?: string;
    fromAddress: string;
    fromName: string;
  };
  security: {
    piiEncryptionKey: string;
    piiEncryptionKeyV1?: string;
    healthCheckSecret: string;
    cronSecret: string;
    turnstileSiteKey: string;
    turnstileSecretKey: string;
    isStrictCsp: boolean;
  };
  shipping: {
    defaultCarrier: string;
    originCountry: string;
    shippoApiKey?: string;
    easypostApiKey?: string;
    usdToLkrRate: number;
  };
  sentry: {
    dsn?: string;
    publicDsn?: string;
    tracesSampleRate?: number;
  };
  verification: {
    pinterest?: string;
    facebook?: string;
    google?: string;
  };
}

/**
 * Returns a strongly typed ServerConfig object based on current process.env.
 * In non-production or build environments, safe defaults are provided to prevent
 * runtime crashes during development, test suites, or static generation.
 */
export function getServerConfig(): ServerConfig {
  const rawNodeEnv = process.env.NODE_ENV;
  const isProduction = rawNodeEnv === "production";
  const isDevelopment = rawNodeEnv === "development";
  const isTest = rawNodeEnv === "test";
  const nodeEnv = rawNodeEnv || "development";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (isProduction ? "https://www.dilnova.pp.ua" : "http://localhost:3000");

  const poolSizeStr = process.env.DATABASE_POOL_SIZE?.trim();
  const poolSize = poolSizeStr && /^\d+$/.test(poolSizeStr) ? parseInt(poolSizeStr, 10) : undefined;

  const smtpPortStr = process.env.SMTP_PORT?.trim();
  const smtpPort = smtpPortStr && /^\d+$/.test(smtpPortStr) ? parseInt(smtpPortStr, 10) : 587;

  const tracesRateStr = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  const tracesRate = tracesRateStr ? parseFloat(tracesRateStr) : undefined;

  const superadminIds = (process.env.SUPERADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const rawUsdRate = process.env.USD_TO_LKR_RATE?.trim();
  const parsedUsdRate = rawUsdRate ? parseFloat(rawUsdRate) : NaN;
  const usdToLkrRate = !isNaN(parsedUsdRate) && parsedUsdRate > 0 ? parsedUsdRate : 307.69;

  return {
    app: {
      url: appUrl,
      name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Dilnova",
      nodeEnv,
      isProduction,
      isDevelopment,
      isTest,
      isVercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV?.trim() || undefined,
      vercelUrl: process.env.VERCEL_URL?.trim() || undefined,
      automationBypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || undefined,
    },
    database: {
      url: process.env.DATABASE_URL || "",
      poolSize,
      migrationUrl: process.env.MIGRATION_DATABASE_URL || undefined,
      ssl: process.env.DATABASE_SSL !== "false",
      isServerless: Boolean(
        process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY,
      ),
    },
    auth: {
      clerkSecretKey: process.env.CLERK_SECRET_KEY || "",
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
      clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET || "",
      previewClerkWebhookSecret: process.env.PREVIEW_CLERK_WEBHOOK_SECRET?.trim() || undefined,
      superadminUserIds: superadminIds,
    },
    storage: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
    media: {
      cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
    },
    upstash: {
      redisUrl: process.env.UPSTASH_REDIS_REST_URL || undefined,
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
      qstashToken: process.env.QSTASH_TOKEN || undefined,
      qstashCurrentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || undefined,
      qstashNextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || undefined,
    },
    email: {
      smtpHost: process.env.SMTP_HOST?.trim() || "smtp-relay.brevo.com",
      smtpPort,
      smtpUser: process.env.SMTP_USER || undefined,
      smtpPassword: process.env.SMTP_PASSWORD || undefined,
      fromAddress: process.env.EMAIL_FROM_ADDRESS?.trim() || "info@dilstar.pp.ua",
      fromName: process.env.EMAIL_FROM_NAME?.trim() || "Dilnova Hub",
    },
    security: {
      piiEncryptionKey: process.env.PII_ENCRYPTION_KEY || "",
      piiEncryptionKeyV1: process.env.PII_ENCRYPTION_KEY_V1?.trim() || undefined,
      healthCheckSecret: process.env.HEALTH_CHECK_SECRET || "",
      cronSecret: process.env.CRON_SECRET || "",
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
      turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || "",
      isStrictCsp: process.env.STRICT_CSP === "true" || process.env.CSP_STRICT === "true",
    },
    shipping: {
      defaultCarrier: process.env.SHIPPING_DEFAULT_CARRIER?.trim() || "slpost",
      originCountry: process.env.SHIPPING_ORIGIN_COUNTRY?.trim() || "LK",
      shippoApiKey: process.env.SHIPPO_API_KEY?.trim() || undefined,
      easypostApiKey: process.env.EASYPOST_API_KEY?.trim() || undefined,
      usdToLkrRate,
    },
    sentry: {
      dsn: process.env.SENTRY_DSN || undefined,
      publicDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
      tracesSampleRate: isNaN(tracesRate as number) ? undefined : tracesRate,
    },
    verification: {
      pinterest: process.env.PINTEREST_DOMAIN_VERIFY || undefined,
      facebook: process.env.FACEBOOK_DOMAIN_VERIFY || undefined,
      google: process.env.GOOGLE_SITE_VERIFY || undefined,
    },
  };
}

/**
 * Centralized, typed environment configuration proxy.
 * Evaluates dynamically against current process.env to ensure runtime mutations
 * (such as in unit test environments) are always accurately reflected.
 */
export const env: ServerConfig = new Proxy({} as ServerConfig, {
  get(_target, prop: string) {
    const config = getServerConfig();
    return config[prop as keyof ServerConfig];
  },
});

/**
 * Validates the server environment variables at startup in production.
 * Throws a fatal descriptive error if any required variables are missing or malformed,
 * halting the application before receiving production traffic.
 */
export function validateServerEnv(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  // Next.js invokes instrumentation during production builds; CI uses placeholder values.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  // SECURITY: Require all three conditions to bypass validation for E2E tests.
  // Prevents accidentally bypassing validation if Vercel sets CI=true.
  if (
    process.env.CLERK_SECRET_KEY === "sk_test_ci_dummy" &&
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL !== "1"
  ) {
    logger.warn(
      "[SECURITY WARNING] Production environment validation was BYPASSED because CLERK_SECRET_KEY='sk_test_ci_dummy' and VERCEL!='1'. This bypass should ONLY occur in CI/E2E automated testing pipelines. If this is a live deployment, critical environment variables are NOT being validated!",
      {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        isCi: Boolean(process.env.CI || process.env.GITHUB_ACTIONS),
      },
    );
    return;
  }

  const result = productionServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    logger.error(
      JSON.stringify({
        level: "error",
        message: "Server environment validation failed",
        missingOrInvalid: formatted,
        timestamp: new Date().toISOString(),
      }),
    );
    throw new Error("Server environment validation failed. Check Vercel environment variables.");
  }

  if (
    process.env.VERCEL_ENV === "preview" &&
    process.env.DATABASE_URL?.includes("jnsfgoafayvlukjkqzjm")
  ) {
    logger.error(
      JSON.stringify({
        level: "error",
        message: "Preview deployment attempted to use production database",
        timestamp: new Date().toISOString(),
      }),
    );
    throw new Error(
      "Preview deployments must not use the production DATABASE_URL. Please configure a separate branch database URL for previews.",
    );
  }
}
