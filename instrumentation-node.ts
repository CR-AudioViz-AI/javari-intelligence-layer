/**
 * instrumentation-node.ts — ISOLATION TEST 3.
 *
 * track() is RESTORED in middleware. The only variable changed here is whether the
 * env shim is INSTALLED at all.
 *
 * Test 2 (track removed + register no-op) served 200. Test 3 restored BOTH track
 * and a non-blocking warm and returned 500 — two variables at once, which is my own
 * isolation rule broken, so it told me nothing.
 *
 * This build keeps track() and skips ONLY installEnvShim(). If it serves 200, the
 * Proxy that installEnvShim puts over process.env is the cause, not the warm — and
 * making the warm non-blocking was fixing the wrong half.
 */
export async function registerNode(): Promise<void> {
  console.log(JSON.stringify({ level: "INFO", event: "ENV_SHIM_SKIPPED_FOR_TEST" }));
}
