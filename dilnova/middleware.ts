import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/unauthorized',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/vendors(.*)',
  '/products(.*)',   // Allows public access to all products and services
  '/api(.*)',        // Allows public API queries (e.g. database reads)
  '/_next(.*)'       // Allows public access to Next.js static files/image optimization
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
