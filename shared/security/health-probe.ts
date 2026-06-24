import type { UpstashRateLimitProbe } from '@/shared/security/upstash-health';

export function isAuthorizedHealthDetailRequest(request: Request): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

export interface PublicHealthResponse {
  status: 'ok' | 'degraded' | 'error';
}

export interface DetailedHealthResponse extends PublicHealthResponse {
  timestamp: string;
  database: 'connected' | 'disconnected';
  rateLimit: UpstashRateLimitProbe;
  error?: string;
}

export function buildPublicHealthResponse(status: PublicHealthResponse['status']): PublicHealthResponse {
  return { status };
}
