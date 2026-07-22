import { db } from "@/shared/db/client";
import { sql } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import {
  buildPublicHealthResponse,
  isAuthorizedHealthDetailRequest,
  type DetailedHealthResponse,
} from "@/shared/security/health-probe";
import { probeUpstashRateLimit } from "@/shared/security/upstash-health";

import { withErrorHandler } from "@/shared/api/api-handler";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (request: Request) => {
  return runWithCorrelationId(async () => {
    const showDetails = isAuthorizedHealthDetailRequest(request);
    const rateLimit = showDetails ? await probeUpstashRateLimit() : null;

    try {
      await db.execute(sql`SELECT 1`);

      const productionNeedsUpstash =
        showDetails && process.env.NODE_ENV === "production" && rateLimit?.status !== "ok";
      const status = productionNeedsUpstash ? "degraded" : "ok";

      if (!showDetails) {
        return Response.json(buildPublicHealthResponse(status), {
          status: status === "ok" ? 200 : 503,
        });
      }

      const body: DetailedHealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        database: "connected",
        rateLimit: rateLimit!,
      };

      return Response.json(body, { status: status === "ok" ? 200 : 503 });
    } catch (error) {
      logger.error("Health check failed", error);

      if (!showDetails) {
        return Response.json(buildPublicHealthResponse("error"), { status: 500 });
      }

      const body: DetailedHealthResponse = {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        rateLimit: rateLimit ?? {
          configured: false,
          urlPresent: false,
          tokenPresent: false,
          urlLooksValid: false,
          pingOk: false,
          limitOk: false,
          status: "missing_env",
          hint: "Upstash probe skipped or unavailable.",
        },
        error:
          process.env.NODE_ENV === "production"
            ? "Internal database connection failed."
            : error instanceof Error
              ? error.message
              : "Unknown error",
      };

      return Response.json(body, { status: 500 });
    }
  });
});
