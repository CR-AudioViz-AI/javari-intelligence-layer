/**
 * instrumentation-node.ts
 *
 * 2026-08-30. The Node-only half of the instrumentation hook.
 *
 * THE BOOT MUST NOT BE ABLE TO TAKE THE SERVER DOWN, and it could.
 *
 * register() is awaited by Next and MUST COMPLETE BEFORE THE SERVER ACCEPTS ANY
 * REQUEST. This file used to `await warmEnvShim()`, which fetches FORTY-PLUS
 * secrets — each a network round trip plus AES-GCM decryption. If that was slow,
 * hung, or the vault was unreachable, the server never became ready and EVERY
 * request returned 500, including 404s.
 *
 * Isolated by measurement, after two confident wrong answers:
 *   removed the edge crypto fallback   still 500  -> not the bundler
 *   removed track() from middleware    still 500  -> not the SDK on edge
 *   neutralised register()             200        -> found it
 * The tell was that a NONEXISTENT path returned 500 while /_next/static returned
 * 404, which puts the failure before routing, and /api/metrics also 500'd, which
 * rules out the root layout because API routes never render it.
 *
 * THE SPLIT THAT FIXES IT:
 *   installEnvShim()  synchronous, no I/O, must happen before anything reads
 *                     process.env. Kept awaited-equivalent — it is a Proxy swap.
 *   warmEnvShim()     network. NOT awaited. Fire it and let the server come up.
 *
 * Nothing breaks while the cache is cold: getSecretSync already falls back to
 * process.env for any key not yet warmed. Warming is an OPTIMISATION, and it was
 * being treated as a precondition.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201
 */

export async function registerNode(): Promise<void> {
  let installEnvShim: () => void;
  let warmEnvShim: () => Promise<{ warmed: number; cache: { size: number } }>;

  try {
    ({ installEnvShim, warmEnvShim } = await import("@/lib/platform-secrets/env-shim"));
  } catch (e) {
    // The module itself failed to load. Say so and let the server start on plain
    // process.env rather than refusing to boot.
    console.warn(
      JSON.stringify({
        level: "WARN",
        event: "ENV_SHIM_IMPORT_FAILED",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return;
  }

  try {
    installEnvShim();
  } catch (e) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        event: "ENV_SHIM_INSTALL_FAILED",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return;
  }

  // NOT AWAITED. The server comes up now; the cache fills behind it.
  void warmEnvShim()
    .then((r) => {
      console.log(
        JSON.stringify({ level: "INFO", event: "ENV_SHIM_WARM", warmed: r.warmed, cache: r.cache.size }),
      );
    })
    .catch((e: unknown) => {
      // Logged, never thrown. An unhandled rejection here would be the same
      // outage by a different route.
      console.warn(
        JSON.stringify({
          level: "WARN",
          event: "ENV_SHIM_WARM_FAILED",
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    });

  console.log(JSON.stringify({ level: "INFO", event: "ENV_SHIM_READY", warming: "background" }));
}
