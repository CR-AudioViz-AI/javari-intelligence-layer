/**
 * instrumentation-node.ts
 *
 * 2026-08-30. The Node-only half of the instrumentation hook, in its own file.
 *
 * WHY A SEPARATE FILE AND NOT A GUARDED IMPORT IN instrumentation.ts:
 * Next calls register() in EVERY runtime and compiles instrumentation.ts for
 * both. Importing a shared lib module from inside the nodejs guard is still a
 * static edge in webpack's graph, so the edge compilation followed
 *   env-shim -> getSecret -> vault/getSecret -> crypto
 * and failed with "Can't resolve 'crypto'". The guard runs at execution time;
 * resolution happens before that.
 *
 * Next's own documentation is explicit: "We call register in all environments,
 * so it's necessary to conditionally import any code that doesn't support both
 * edge and nodejs", and the pattern it gives imports a DEDICATED FILE per
 * runtime. A dedicated file is a chunk boundary Next can keep out of the edge
 * bundle; a shared module reachable from other code is not.
 *
 * Three bundler-config attempts were made before reading the documentation:
 * resolve.fallback { crypto: false } made the build pass and every request
 * return 500, because it also removes the Web Crypto GLOBAL that edge
 * middleware uses. Removing it failed the build. resolve.alias on the @/ path
 * never matched, because tsconfig paths expand before webpack's alias is
 * consulted. No bundler configuration fixes a static import chain.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201
 */

export async function registerNode(): Promise<void> {
  try {
    const { installEnvShim, warmEnvShim } = await import("@/lib/platform-secrets/env-shim");
    installEnvShim();
    await warmEnvShim();
    console.log(JSON.stringify({ level: "INFO", event: "ENV_SHIM_READY" }));
  } catch (e) {
    // Named, not swallowed. A vault that fails to warm means every getSecretSync
    // falls back to process.env, and that difference has to be visible in logs.
    console.warn(
      JSON.stringify({
        level: "WARN",
        event: "ENV_SHIM_FAILED",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}
