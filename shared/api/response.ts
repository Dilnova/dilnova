import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiSuccessOptions {
  status?: number;
  message?: string;
  headers?: HeadersInit;
}

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
  headers?: HeadersInit;
}

/**
 * Creates a standard JSON success response with HTTP status (defaults to 200).
 * If data is an object (and not null / array), top-level properties are also spread
 * onto the returned JSON object for backward compatibility with clients accessing root fields.
 */
export function apiSuccess<T>(data: T, options?: ApiSuccessOptions): NextResponse {
  const status = options?.status ?? 200;
  const message = options?.message;
  const headers = options?.headers;

  let body: Record<string, unknown>;

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    body = {
      success: true,
      data,
      ...data,
      ...(message ? { message } : {}),
    };
  } else {
    body = {
      success: true,
      data,
      ...(message ? { message } : {}),
    };
  }

  return NextResponse.json(body, { status, headers });
}

/**
 * Creates a standard JSON error response with HTTP status (defaults to 400).
 * Always includes { success: false, error: string }.
 */
export function apiError(error: string, options?: ApiErrorOptions): NextResponse {
  const status = options?.status ?? 400;
  const code = options?.code;
  const details = options?.details;
  const headers = options?.headers;

  const body: Record<string, unknown> = {
    success: false,
    error,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
  };

  return NextResponse.json(body, { status, headers });
}
