import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server'
import { track } from '@/lib/analytics/track'

// 2026-08-30: track() is RESTORED. It was removed on this branch as isolation test
// 1, and the 500 was UNCHANGED without it — so the SDK reaching the edge bundle was
// never the cause. The cause was the instrumentation hook awaiting a 40-key vault
// warm before the server would accept requests. Fixed in instrumentation-node.ts.
//
// Keeping the removal would have deleted working analytics to fix something it was
// not causing.
export function middleware(request: NextRequest, event: NextFetchEvent): NextResponse {
  const response = NextResponse.next()
  try {
    event.waitUntil(track({
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') ?? '',
      referrer: request.headers.get('referer'),
      ip: (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null,
      country: request.headers.get('x-vercel-ip-country'),
      appId: request.nextUrl.hostname,
      sessionId: request.cookies.get('zsid')?.value ?? null,
      userId: null,
    }))
  } catch {
    // Analytics must never break a request.
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.webp|.*\\.ico).*)'],
}
