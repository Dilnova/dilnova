import type { UpstashRateLimitProbe } from "@/shared/security/upstash-health";
import { env } from "@/shared/config/env";

export function isAuthorizedHealthDetailRequest(request: Request): boolean {
  const secret = env.security.healthCheckSecret?.trim();
  if (!secret) {
    // Allow detailed probes in non-production if no secret is set
    if (!env.app.isProduction) {
      return true;
    }
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export interface PublicHealthResponse {
  status: "ok" | "degraded" | "error";
}

export interface DetailedHealthResponse extends PublicHealthResponse {
  timestamp: string;
  database: "connected" | "disconnected";
  rateLimit: UpstashRateLimitProbe;
  error?: string;
}

export function buildPublicHealthResponse(
  status: PublicHealthResponse["status"],
): PublicHealthResponse {
  return { status };
}
