import { NextResponse } from "next/server";
import { syncLiveExchangeRates } from "@/shared/currency/exchange-rates.service";
import { logger } from "@/shared/logging/logger";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify cron authorization header if configured in production
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncLiveExchangeRates();

    logger.info("FX exchange rates background sync completed", { result });

    return NextResponse.json({
      success: result.success,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to run FX exchange rates background sync", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal Server Error during FX rate sync" },
      { status: 500 },
    );
  }
}
