import { apiSuccess, apiError } from "@/shared/api/response";
import { checkAllVendorsSocialTokenHealth } from "@/features/social-share/services/token-health";
import { logger } from "@/shared/logging/logger";
import { env } from "@/shared/config/env";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = env.security.cronSecret?.trim();

    // Fail-closed authorization: require valid CRON_SECRET in production or whenever configured
    if (env.app.isProduction || cronSecret) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn("[CronSocialTokenHealth] Unauthorized request to social token health endpoint");
        return apiError("Unauthorized", { status: 401 });
      }
    }

    logger.info(
      "[CronSocialTokenHealth] Initiating scheduled social token health check and refresh",
    );

    const summary = await checkAllVendorsSocialTokenHealth();

    logger.info("[CronSocialTokenHealth] Completed scheduled social token health check", {
      summary,
    });

    return apiSuccess({
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[CronSocialTokenHealth] Failed to run scheduled social token health check", {
      error: error instanceof Error ? error.message : String(error),
    });

    return apiError("Internal Server Error during social token health check", { status: 500 });
  }
}
