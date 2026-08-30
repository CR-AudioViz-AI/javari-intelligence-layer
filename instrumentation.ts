/**
 * instrumentation.ts — ISOLATION TEST 2, temporary.
 *
 * register() is deliberately a no-op. See the commit message: track() removal did
 * not change the 500, app/layout.tsx is ruled out because /api/metrics also 500s
 * and API routes do not render the layout, and static assets 404 correctly while
 * a nonexistent path 500s.
 *
 * This is the last thing that runs before every request on both runtimes.
 */
export async function register(): Promise<void> {
  // no-op for this test only
}
