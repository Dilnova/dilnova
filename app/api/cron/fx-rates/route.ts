import { apiSuccess, apiError } from "@/shared/api/response";
import { syncLiveExchangeRates } from "@/shared/currency/exchange-rates.service";
import { logger } from "@/shared/logging/logger";
import { env } from "@/shared/config/env";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = env.security.cronSecret?.trim();

    // Fail-closed authorization: require valid CRON_SECRET in production or whenever configured
    if (env.app.isProduction || cronSecret) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn("Unauthorized request to cron FX exchange rate sync endpoint");
        return apiError("Unauthorized", { status: 401 });
      }
    }

    const result = await syncLiveExchangeRates();

    logger.info("FX exchange rates background sync completed", { result });

    return apiSuccess({
      success: result.success,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to run FX exchange rates background sync", {
      error: error instanceof Error ? error.message : String(error),
    });

    return apiError("Internal Server Error during FX rate sync", { status: 500 });
  }
}
