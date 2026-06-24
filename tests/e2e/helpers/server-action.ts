import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

const MANIFEST_PATH = path.join(process.cwd(), '.next/server/server-reference-manifest.json');

type RscClient = {
  encodeReply: (value: unknown, options: { temporaryReferences: unknown }) => Promise<string | FormData>;
  createTemporaryReferenceSet: () => unknown;
};

function getRscClient(): RscClient {
  // Lazy-load CJS encoder so Playwright ESM test files can import this module safely.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./rsc-encode.cjs') as RscClient;
}

type ManifestEntry = {
  exportedName?: string;
  filename?: string;
  workers?: Record<string, unknown>;
};

type ManifestBucket = Record<string, ManifestEntry>;

interface ServerReferenceManifest {
  node?: ManifestBucket;
  edge?: ManifestBucket;
}

const DENIAL_PATTERNS = [
  /not authorized/i,
  /Unauthorized/i,
  /does not belong/i,
  /You must be signed in/i,
  /Please sign in/i,
  /Only organization admins/i,
  /Only administrators/i,
  /Only global administrators/i,
  /Item not found or does not belong/i,
  /Order not found/i,
  /You are not authorized to update this order/i,
  /This order does not include items from your organization/i,
  /Invalid payment slip submission/i,
  /Payment slip storage is not configured/i,
];

export interface ServerActionInvokeResult {
  status: number;
  text: string;
  denied: boolean;
  actionNotFound: boolean;
}

export interface InvokeServerActionOptions {
  /** POST target path (include query string when the action is bound to that page). */
  postPath: string;
  /** Partial module path, e.g. `catalog/vendor.actions`. */
  moduleFileSuffix: string;
  exportName: string;
  args: unknown[];
}

function readManifest(): ServerReferenceManifest | null {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as ServerReferenceManifest;
  } catch {
    return null;
  }
}

function workerHintFromPostPath(postPath: string): string | null {
  const pathname = postPath.split('?')[0];
  if (pathname.startsWith('/vendor')) return 'app/(vendor)/vendor/page';
  if (pathname.startsWith('/superadmin')) return 'app/(superadmin)/superadmin/page';
  if (pathname.startsWith('/admin')) return 'app/(admin)/admin/page';
  if (pathname.startsWith('/customer/invoice')) return 'app/(customer)/customer/invoice/[id]/page';
  if (pathname.startsWith('/customer')) return 'app/(customer)/customer/page';
  if (pathname.startsWith('/cart')) return 'app/cart/page';
  return null;
}

/** Resolve a Next.js server action id from the production build manifest. */
export function resolveServerActionId(
  moduleFileSuffix: string,
  exportName: string,
  postPath?: string,
): string | null {
  const manifest = readManifest();
  if (!manifest) {
    return null;
  }

  const matches: Array<{ id: string; meta: ManifestEntry }> = [];

  for (const bucket of [manifest.node, manifest.edge]) {
    if (!bucket) {
      continue;
    }
    for (const [id, meta] of Object.entries(bucket)) {
      if (meta.exportedName === exportName && meta.filename?.includes(moduleFileSuffix)) {
        matches.push({ id, meta });
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }

  const workerHint = postPath ? workerHintFromPostPath(postPath) : null;
  if (workerHint) {
    const preferred = matches.find(({ meta }) =>
      Object.keys(meta.workers ?? {}).some((workerPath) => workerPath === workerHint),
    );
    if (preferred) {
      return preferred.id;
    }
  }

  return matches[0]?.id ?? null;
}

export function isSecurityDenial(text: string, status: number): boolean {
  if (status >= 400) {
    return true;
  }
  // Customer actions often return { success: false } instead of throwing.
  if (/success["\s]*:\s*false/i.test(text)) {
    return true;
  }
  if (DENIAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }
  // Next.js encodes thrown server-action errors in RSC flight payloads (digest).
  if (/digest/i.test(text) && !/"success"\s*:\s*true/i.test(text)) {
    return true;
  }
  // Unsigned sessions often receive an HTML document instead of an RSC action payload.
  if (
    text.includes('<!DOCTYPE html>') &&
    !/"success"\s*:\s*true/i.test(text) &&
    !text.includes('text/x-component')
  ) {
    return true;
  }
  return false;
}

/** Wait until Next has emitted the server action manifest (dev server compiles on boot). */
export async function waitForServerActionManifest(timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const manifest = readManifest();
    if (manifest?.node && Object.keys(manifest.node).length > 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server action manifest not found at ${MANIFEST_PATH} within ${timeoutMs}ms`);
}

/** Invoke a server action over HTTP with the current Playwright page session cookies. */
export async function invokeServerAction(
  page: Page,
  options: InvokeServerActionOptions,
): Promise<ServerActionInvokeResult> {
  const actionId = resolveServerActionId(
    options.moduleFileSuffix,
    options.exportName,
    options.postPath,
  );
  if (!actionId) {
    throw new Error(
      `Server action "${options.exportName}" (${options.moduleFileSuffix}) was not found in ${MANIFEST_PATH}. Run pnpm build before test:e2e.`,
    );
  }

  const rscClient = getRscClient();
  const temporaryReferences = rscClient.createTemporaryReferenceSet();
  const body = await rscClient.encodeReply(options.args, { temporaryReferences });

  const headers = {
    Accept: 'text/x-component',
    'next-action': actionId,
  };

  let response;
  if (typeof body === 'string') {
    response = await page.request.post(options.postPath, { headers, data: body });
  } else if (body instanceof FormData) {
    const multipart: Record<
      string,
      string | { name: string; mimeType: string; buffer: Buffer }
    > = {};
    for (const [key, value] of body.entries()) {
      if (typeof value === 'string') {
        multipart[key] = value;
        continue;
      }
      const blob = value as Blob;
      multipart[key] = {
        name: value instanceof File && value.name ? value.name : `${key}.bin`,
        mimeType: blob.type || 'application/octet-stream',
        buffer: Buffer.from(await blob.arrayBuffer()),
      };
    }
    response = await page.request.post(options.postPath, { headers, multipart });
  } else {
    response = await page.request.post(options.postPath, {
      headers,
      data: Buffer.from(await new Response(body as BodyInit).arrayBuffer()),
    });
  }

  const text = await response.text();
  const actionNotFound = response.headers()['next-action-not-found'] === '1';

  return {
    status: response.status(),
    text,
    actionNotFound,
    denied:
      actionNotFound ||
      text.includes('Server action not found') ||
      isSecurityDenial(text, response.status()),
  };
}

export function expectSecurityDenied(result: ServerActionInvokeResult): void {
  if (result.actionNotFound) {
    throw new Error(`Server action was not found. Response: ${result.text.slice(0, 200)}`);
  }
  if (!result.denied) {
    throw new Error(
      `Expected security denial but got status ${result.status}. Response: ${result.text.slice(0, 300)}`,
    );
  }
  if (/"success"\s*:\s*true/i.test(result.text)) {
    throw new Error('Server action unexpectedly succeeded.');
  }
}
