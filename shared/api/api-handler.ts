import { NextResponse } from "next/server";
import { logger } from "@/shared/logging/logger";

type RouteHandler = (req: Request, ...args: any[]) => Promise<Response> | Response;

/**
 * Standardizes API error handling for Next.js Route Handlers.
 * Wraps route execution in a try/catch, logging errors and returning a standard 500 JSON payload.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: Request, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error: unknown) {
      const safeUrl = req.url.replace(/[\r\n]/g, "");
      logger.error("[API Error]", error, { method: req.method, url: safeUrl });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
