import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/unauthorized',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/vendors(.*)',
  '/products(.*)',   // Allows public access to all products and services
  '/cart',           // Allows cart viewing; checkout requires sign-in
  '/contact',        // Allows public contact form submissions
  '/api/health(.*)', // Allows public access to the health check endpoint
  '/api/csp-report(.*)', // Allows public access to CSP violation reports
  '/api/webhooks/clerk(.*)', // Allows public access to Clerk webhooks (secured by signature verification)
  '/_next(.*)',      // Allows public access to Next.js static files/image optimization
  '/sitemap.xml',    // Allow public access to sitemap.xml
  '/robots.txt',     // Allow public access to robots.txt
  '/privacy(.*)',    // Allow public access to privacy policy
  '/terms(.*)'       // Allow public access to terms of service
]);

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

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const clerkDomains = [
    'https://img.clerk.com',
    'https://*.clerk.com',
    'https://*.clerk.accounts.dev',
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

  // ACCEPTED RISK: 'unsafe-inline' in style-src is maintained as a trade-off for 
  // Tailwind CSS and React inline style compatibility. The practical risk of CSS 
  // exfiltration is low given React's rendering model and strict script-src policies.
  // Consider migrating to CSS-in-JS with nonce support to eliminate unsafe-inline in the future.
  const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${clerkDomainsStr} https://challenges.cloudflare.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:${excludeEval ? '' : " 'unsafe-eval'"}; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; font-src 'self' https://*.gstatic.com https://*.googleapis.com data:; img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com ${clerkDomainsStr} https://*.backblazeb2.com${supabaseHostCsp} https://translate.google.com http://translate.google.com https://*.googleapis.com https://*.gstatic.com https://*.google.com; connect-src 'self' ${clerkDomainsStr} https://api.clerk.com https://api.cloudinary.com${supabaseHostCsp} https://*.googleapis.com https://translate.google.com https://va.vercel-scripts.com https://clerk-telemetry.com; media-src 'self' blob: data: https://res.cloudinary.com; frame-src 'self' ${clerkDomainsStr} https://challenges.cloudflare.com; worker-src 'self' blob:; ${reportingDirectives}${isProd ? ' upgrade-insecure-requests;' : ''}`;

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

export default function proxy(request: NextRequest, event: NextFetchEvent) {
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

  // Bypass Clerk entirely in CI when dummy keys are present to prevent NXDOMAIN redirect/hangs
  if (process.env.NODE_ENV !== 'production' && process.env.CLERK_SECRET_KEY === 'sk_test_ci_dummy') {
    return NextResponse.next();
  }

  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
