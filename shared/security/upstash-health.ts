import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

export type UpstashRateLimitProbe = {
  configured: boolean;
  urlPresent: boolean;
  tokenPresent: boolean;
  urlLooksValid: boolean;
  pingOk: boolean;
  limitOk: boolean;
  status: 'ok' | 'missing_env' | 'invalid_url' | 'ping_failed' | 'limit_failed';
  hint: string;
  error?: string;
};

function stripEnvQuotes(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function readUpstashEnv(): { url?: string; token?: string } {
  const url = stripEnvQuotes(process.env.UPSTASH_REDIS_REST_URL);
  const token = stripEnvQuotes(process.env.UPSTASH_REDIS_REST_TOKEN);
  return { url, token };
}

export function isValidUpstashRestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('upstash.io');
  } catch {
    return false;
  }
}

export async function probeUpstashRateLimit(): Promise<UpstashRateLimitProbe> {
  const { url, token } = readUpstashEnv();
  const urlPresent = Boolean(url);
  const tokenPresent = Boolean(token);

  if (!url || !token) {
    return {
      configured: false,
      urlPresent,
      tokenPresent,
      urlLooksValid: false,
      pingOk: false,
      limitOk: false,
      status: 'missing_env',
      hint: 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel Production env, then redeploy.',
    };
  }

  if (!isValidUpstashRestUrl(url)) {
    return {
      configured: true,
      urlPresent,
      tokenPresent,
      urlLooksValid: false,
      pingOk: false,
      limitOk: false,
      status: 'invalid_url',
      hint: 'Use the REST URL from Upstash (https://....upstash.io), not the rediss:// connection string.',
      error: 'UPSTASH_REDIS_REST_URL must be an https://....upstash.io REST endpoint.',
    };
  }

  try {
    const redis = new Redis({ url, token });
    const ping = await redis.ping();
    if (ping !== 'PONG') {
      return {
        configured: true,
        urlPresent,
        tokenPresent,
        urlLooksValid: true,
        pingOk: false,
        limitOk: false,
        status: 'ping_failed',
        hint: 'Upstash ping did not return PONG. Verify the database is active and the token matches this URL.',
        error: `Unexpected ping response: ${String(ping)}`,
      };
    }

    const client = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '60 s'),
      prefix: '@upstash/ratelimit-health',
    });
    const result = await client.limit('health-probe');

    if (!result.success && result.remaining === 0 && result.limit === 0) {
      return {
        configured: true,
        urlPresent,
        tokenPresent,
        urlLooksValid: true,
        pingOk: true,
        limitOk: false,
        status: 'limit_failed',
        hint: 'Upstash ping works but rate limit call failed. Check token permissions for this database.',
        error: 'Ratelimit.limit returned an unexpected result.',
      };
    }

    return {
      configured: true,
      urlPresent,
      tokenPresent,
      urlLooksValid: true,
      pingOk: true,
      limitOk: true,
      status: 'ok',
      hint: 'Upstash rate limiting is configured and reachable.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Upstash error';
    return {
      configured: true,
      urlPresent,
      tokenPresent,
      urlLooksValid: isValidUpstashRestUrl(url),
      pingOk: false,
      limitOk: false,
      status: message.includes('401') || message.toLowerCase().includes('unauthorized') ? 'ping_failed' : 'limit_failed',
      hint:
        message.includes('401') || message.toLowerCase().includes('unauthorized')
          ? 'Upstash rejected the token (401). Copy a fresh UPSTASH_REDIS_REST_TOKEN from the Upstash REST API tab.'
          : 'Upstash request failed. Confirm URL + token belong to the same database and redeploy.',
      error: message,
    };
  }
}
