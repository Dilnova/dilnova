import { clerkMiddleware } from '@clerk/nextjs/server';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';


function getSentryCspReportUri(): string | null {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, '');
    const host = url.host;
    if (publicKey && projectId && host) {
      return `https://${host}/api/${projectId}/security/?sentry_key=${publicKey}`;
    }
  } catch {}
  return null;
}

const clerkHandler = clerkMiddleware(async (auth, req) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-nonce', nonce);

  // Define CSP first to attach to both request and response
  const clerkDomains = [
    'https://img.clerk.com',
    'https://*.clerk.com',
    'https://*.clerk.accounts.dev',
    'https://clerk.dilstar.pp.ua',
  ];
  const clerkDomainsStr = clerkDomains.join(' ');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseHostCsp = '';
  if (supabaseUrl) {
    try {
      supabaseHostCsp = ` https://${new URL(supabaseUrl).hostname}`;
    } catch {}
  }

  const isProd = process.env.NODE_ENV === 'production';
  const isVercelProdOrPreview = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
  const excludeEval = isProd || isVercelProdOrPreview;
  const sentryCspUrl = getSentryCspReportUri();
  
  const reportingDirectives = sentryCspUrl
    ? `report-uri ${sentryCspUrl};`
    : `report-uri /api/csp-report; report-to csp-endpoint;`;

  const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${clerkDomainsStr} https://challenges.cloudflare.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:${excludeEval ? '' : " 'unsafe-eval'"}; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; font-src 'self' https://*.gstatic.com https://*.googleapis.com data:; img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com ${clerkDomainsStr} https://*.googleusercontent.com https://avatars.githubusercontent.com https://*.backblazeb2.com${supabaseHostCsp} https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://*.google.com; connect-src 'self' ${clerkDomainsStr} https://api.clerk.com https://api.cloudinary.com${supabaseHostCsp} https://*.googleapis.com https://translate.google.com https://va.vercel-scripts.com https://clerk-telemetry.com; media-src 'self' blob: data: https://res.cloudinary.com; frame-src 'self' ${clerkDomainsStr} https://challenges.cloudflare.com; worker-src 'self' blob:; ${reportingDirectives}${isProd ? ' upgrade-insecure-requests;' : ''}`;

  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const reportToUrl = `${protocol}://${host}/api/csp-report`;
  
  const reportToHeader = sentryCspUrl
    ? null
    : JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: reportToUrl }],
      });

  response.headers.set('x-request-id', requestId);
  response.headers.set('Content-Security-Policy', cspHeader);
  if (reportToHeader) {
    response.headers.set('Report-To', reportToHeader);
  }
  return response;
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  // CSRF protection:
  // Enforce that mutating requests (except webhook and csp-report endpoints) have a valid Origin matching Host or X-Forwarded-Host.
  const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (MUTATING_METHODS.includes(request.method)) {
    const pathname = request.nextUrl.pathname;
    const isWebhook = pathname.startsWith('/api/webhooks/');
    const isCspReport = pathname === '/api/csp-report';

    if (!isWebhook && !isCspReport) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

      if (!origin || !host) {
        return new NextResponse('CSRF Verification Failed: Missing Origin or Host header.', {
          status: 403,
        });
      }

      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return new NextResponse('CSRF Verification Failed: Mismatched Origin and Host.', {
            status: 403,
          });
        }
      } catch {
        return new NextResponse('CSRF Verification Failed: Invalid Origin header.', {
          status: 403,
        });
      }
    }
  }

  // SECURITY: Bypass Clerk entirely in CI when dummy keys are present to prevent NXDOMAIN redirect/hangs.
  // This bypass MUST check all three conditions to prevent an accidental production authentication bypass:
  // 1. CLERK_SECRET_KEY must be the dummy key.
  // 2. NODE_ENV must not be production.
  // 3. VERCEL must not be '1' (ensures it never runs on a Vercel deployment, preview or prod).
  if (
    process.env.CLERK_SECRET_KEY === 'sk_test_ci_dummy' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.VERCEL !== '1'
  ) {
    return NextResponse.next();
  }

  try {
    const res = await clerkHandler(request, event);
    return res;
  } catch (error) {
    console.error('Clerk Middleware execution failed (API outage):', error);
    return new NextResponse(
      'Authentication Service is currently unavailable. Please try again later.',
      { status: 503 }
    );
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
