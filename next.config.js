/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-08-29: required for @craudioviz/platform-sdk. The SDK ships raw
  // TypeScript and Next does not run node_modules through SWC by default, so
  // any import carrying a `type` re-export fails the build without this.
  transpilePackages: ["@craudioviz/platform-sdk"],
  async headers() {
    // 2026-08-13: every vertical app served none of these. The core platform
    // has had them since July; the satellites were never given them. Without
    // X-Frame-Options any of these pages can be framed for clickjacking,
    // without nosniff a user-uploaded file can be coaxed into executing, and
    // without a referrer policy the full URL leaks to every third party.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};


// 2026-08-30, FOURTH PASS — and this one addresses the cause rather than the
// symptom.
//
// THE PROBLEM: Next 15 compiles instrumentation.ts for the EDGE runtime as well
// as node. Webpack resolves every import it finds there, and the runtime guard
// inside register() cannot help, because the guard runs AFTER resolution:
//
//   instrumentation.ts -> platform-secrets/env-shim -> getSecret
//                      -> vault/getSecret -> platform-secrets/crypto
//                      -> import { createCipheriv, ... } from "crypto"
//
// WHAT WAS TRIED AND WHY IT FAILED:
//
//   resolve.fallback = { crypto: false }
//     Build passed. EVERY REQUEST RETURNED 500 in production, verified against
//     the pre-upgrade build serving 200 at its own URL. It is too broad: it
//     targets the identifier `crypto` across the whole edge compilation, and
//     middleware.ts on this app calls crypto.subtle.digest — WEB Crypto, the edge
//     global. track.ts says so in its own comment: "Web Crypto, not node:crypto.
//     This runs in Edge middleware."
//
//   removing it entirely
//     Build failed outright on the import above.
//
// THE FIX: alias the vault ENTRY POINT to an empty module for the edge build
// only. Webpack replaces env-shim with nothing and never follows it to crypto, so
// the chain is cut at its head rather than patched at its tail. Nothing else in
// the edge bundle is touched — the Web Crypto global is untouched, because this
// aliases a MODULE PATH and not an identifier.
//
// Safe because instrumentation.ts already returns early off nodejs, so the empty
// module is never executed on edge. It was only ever being COMPILED there.
const _edgeVaultOff = (config, { nextRuntime }) => {
  if (nextRuntime === "edge") {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/lib/platform-secrets/env-shim": false,
    };
  }
  return config;
};

module.exports = { ...nextConfig, webpack: _edgeVaultOff };
