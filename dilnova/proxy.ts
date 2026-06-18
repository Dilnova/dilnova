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
  '/_next(.*)',      // Allows public access to Next.js static files/image optimization
  '/sitemap.xml',    // Allow public access to sitemap.xml
  '/robots.txt'      // Allow public access to robots.txt
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('x-request-id', requestId);
  return response;
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // CSRF protection for Server Actions:
  // Enforce that POST requests with a Next-Action header have a valid Origin matching Host or X-Forwarded-Host.
  if (request.method === 'POST' && request.headers.has('next-action')) {
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
