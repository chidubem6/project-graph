import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Fall back to the defaults so a deploy missing these vars doesn't lock
// signed-out users out of the sign-in page.
const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in"
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up"

// Deny by default: anything not listed here needs a session. A new route is
// therefore guarded the moment it lands, rather than whenever someone remembers
// to add it to an allowlist of protected paths.
const isPublicRoute = createRouteMatcher([
  // (.*) keeps Clerk's nested steps public too, e.g. /sign-in/sso-callback.
  `${signInUrl}(.*)`,
  `${signUpUrl}(.*)`,
  // Clerk's auto-proxy handles its own auth; protecting it would loop.
  "/__clerk(.*)",
])

export const proxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
