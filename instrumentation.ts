/**
 * instrumentation.ts
 *
 * 2026-08-30. Rewritten to Next's documented runtime-split pattern.
 *
 * The vault work moved to ./instrumentation-node. This file now contains no
 * reference to it that the EDGE compilation can follow, which is the whole
 * point: Next compiles instrumentation for both runtimes, and webpack resolves
 * every import it can reach regardless of the runtime guard, because resolution
 * precedes execution.
 *
 * CR AudioViz AI, LLC · EIN 39-3646201
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
  // No edge branch. Nothing needs to run there, and adding an empty one would
  // only invite someone to fill it with something that does not belong.
}
