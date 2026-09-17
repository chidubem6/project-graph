import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Deny by default: anything not listed here needs a session. A new route under
// (app) is therefore guarded the moment it lands, rather than whenever someone
// remembers to add it to an allowlist of protected paths.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  // Clerk's auto-proxy handles its own auth; protecting it would loop.
  '/__clerk(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
