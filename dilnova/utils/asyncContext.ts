import { headers } from 'next/headers';
import type { AsyncLocalStorage } from 'node:async_hooks';

let requestStore: AsyncLocalStorage<RequestContext> | null = null;

if (typeof window === 'undefined') {
  try {
    // Dynamically require node:async_hooks so it doesn't fail bundler analysis for Edge/Client runtimes.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require('node:async_hooks');
    requestStore = new AsyncLocalStorage();
  } catch {
    // Node.js async_hooks not available (e.g. Edge runtime or during static build)
  }
}

export { requestStore };

export interface RequestContext {
  requestId: string;
}

/**
 * Retrieves the active correlation ID from the current async execution context.
 */
export function getRequestId(): string | undefined {
  if (!requestStore) return undefined;
  const store = requestStore.getStore();
  return store?.requestId;
}

/**
 * Wraps an asynchronous execution block, associating it with a request correlation ID.
 * It will extract the correlation ID from request headers, falling back to a new UUID.
 */
export async function runWithCorrelationId<T>(fn: () => Promise<T>): Promise<T> {
  let requestId = '';
  
  if (typeof window === 'undefined') {
    try {
      const headersList = await headers();
      requestId = headersList.get('x-request-id') || '';
    } catch {
      // headers() can throw during static build or testing when outside request context
    }
  }

  if (!requestId) {
    requestId = crypto.randomUUID();
  }

  if (requestStore) {
    return requestStore.run({ requestId }, fn);
  }

  return fn();
}
