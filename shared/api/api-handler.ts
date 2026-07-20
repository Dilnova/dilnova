import { NextResponse } from 'next/server';

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
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API Error] ${req.method} ${req.url}:`, error);
      return NextResponse.json(
        { error: 'Internal Server Error', message },
        { status: 500 }
      );
    }
  };
}
