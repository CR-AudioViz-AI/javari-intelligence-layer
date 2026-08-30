// middleware.ts — visitor tracking
//
// 2026-08-16: this app had no middleware, so nothing it served was ever logged.
// Any platform-wide traffic figure was only the apps that happened to have one.
//
// Its only job is to log the request and get out of the way. Fire and forget —
// a visitor must not wait on analytics, and an analytics outage must not take a
// page down. Bots are counted rather than blocked, because a traffic number that
// silently includes AhrefsBot is a lie told to yourself.
//
// CR AudioViz AI, LLC · EIN 39-3646201
import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server'
// 2026-08-30 ISOLATION TEST — track() temporarily removed.
// A nonexistent path returns 500 while /_next/static returns 404, and static is
// the one thing this matcher excludes. That puts the failure BEFORE routing,
// which means middleware. track() is the only thing middleware imports, and it
// pulls @craudioviz/platform-sdk into the EDGE bundle.
// If this build serves 200, the SDK on edge is the cause and the fix is to move
// analytics off the edge path rather than to keep patching the bundler.

export function middleware(request: NextRequest, event: NextFetchEvent): NextResponse {
  const response = NextResponse.next()
  try {
      // track(...) removed for this test only.
  } catch {
    // Never let tracking break a request.
  }
  return response
}

export const config = {
  // Static assets are excluded: logging a favicon fetch as a visit inflates
  // every number that matters.
  matcher: ['/((?!_next/static|_next/image|favicon\.ico|.*\.png|.*\.jpg|.*\.svg|.*\.webp|.*\.ico).*)'],
}
