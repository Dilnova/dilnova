import type { AsyncLocalStorage } from "node:async_hooks";

let requestStore: AsyncLocalStorage<RequestContext> | null = null;

if (typeof window === "undefined") {
  try {
    // Dynamically require node:async_hooks so it doesn't fail bundler analysis for Edge/Client runtimes.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require("node:async_hooks");
    requestStore = new AsyncLocalStorage();
  } catch {
    // Node.js async_hooks not available (e.g. Edge runtime or during static build)
  }
}

export { requestStore };

export interface RequestContext {
  requestId: string;
  userId?: string;
  path?: string;
  method?: string;
}

/**
 * Retrieves the active correlation ID from the current async execution context.
 */
export function getRequestId(): string | undefined {
  if (!requestStore) return undefined;
  const store = requestStore.getStore();
  return store?.requestId;
}

export function getUserId(): string | undefined {
  if (!requestStore) return undefined;
  return requestStore.getStore()?.userId;
}

export function getRequestPath(): string | undefined {
  if (!requestStore) return undefined;
  return requestStore.getStore()?.path;
}

export function getRequestMethod(): string | undefined {
  if (!requestStore) return undefined;
  return requestStore.getStore()?.method;
}

/**
 * Wraps an asynchronous execution block, associating it with a request correlation ID.
 * It will extract the correlation ID from request headers, falling back to a new UUID.
 */
export async function runWithCorrelationId<T>(fn: () => Promise<T>): Promise<T> {
  let requestId = "";
  let userId: string | undefined;
  let path: string | undefined;
  let method: string | undefined;

  if (typeof window === "undefined") {
    try {
      const { headers } = await import("next/headers");
      const headersList = await headers();
      requestId = headersList.get("x-request-id") || "";

      const invokePath = headersList.get("x-invoke-path");
      const referer = headersList.get("referer");
      path = invokePath || (referer ? new URL(referer).pathname : undefined);

      if (headersList.get("next-action")) {
        method = "ACTION";
      }
    } catch {
      // headers() can throw during static build or testing when outside request context
    }

    try {
      const { auth } = await import("@clerk/nextjs/server");
      const authObj = await auth();
      userId = authObj?.userId || undefined;
    } catch {
      // auth() might fail if not in a request context
    }
  }

  if (!requestId) {
    requestId = crypto.randomUUID();
  }

  if (requestStore) {
    return requestStore.run({ requestId, userId, path, method }, fn);
  }

  return fn();
}
