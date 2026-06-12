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

  // Check if the request is from a search engine bot/crawler to avoid auth redirects
  const userAgent = req.headers.get('user-agent') || '';
  const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);

  if (!isBot && !isPublicRoute(req)) {
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

export function proxy(request: NextRequest, event: NextFetchEvent) {
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
