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


// 2026-08-30 — STATE OF THIS FILE, and it is not finished. Read this before
// touching it.
//
// THREE CONFIG-LEVEL ATTEMPTS, all measured, none sufficient:
//
//   1. resolve.fallback { crypto: false } for edge
//      Build PASSED. Every request returned 500.
//   2. Removing it
//      Build FAILED: ./lib/platform-secrets/crypto.ts Can't resolve 'crypto'.
//   3. resolve.alias { "@/lib/vault/getSecret": false } for edge
//      Build FAILED IDENTICALLY. The import trace resolves to
//      ./lib/vault/getSecret.ts — tsconfig paths expand the @/ alias before
//      webpack's resolve.alias is consulted, so the key never matches.
//
// WHY (1) BREAKS THE RUNTIME, proven by comparison rather than assumed:
// javari-social carries the identical fallback and serves 200 — it has NO
// middleware, NO instrumentation and nothing touching crypto, so it never
// exercised the fallback and its green result proved nothing. THIS repo has all
// three: middleware runs on EDGE and calls track(), which calls
// crypto.subtle.digest. track.ts says it outright — "Web Crypto, not node:crypto.
// This runs in Edge middleware." resolve.fallback cannot distinguish a node IMPORT
// from the Web Crypto GLOBAL, so it removes both.
//
// THE FIX IS IN THE SOURCE, NOT HERE. lib/platform-secrets/getSecret.ts statically
// imports @/lib/vault/getSecret, which statically imports crypto. Next 15 compiles
// instrumentation.ts for the edge runtime and webpack follows that static chain
// regardless of the nodejs guard inside register(), because resolution happens
// before execution. No bundler configuration fixes a static import chain; the chain
// has to stop existing.
//
// The vault import must become lazy inside the function that uses it, so the edge
// compilation never has a reason to resolve crypto at all. That is a change to how
// every app boots and belongs in a deliberate pass, not appended to this one.
//
// FALLBACK RESTORED so main builds. PRODUCTION IS ON THE ROLLED-BACK 08-16
// DEPLOYMENT AND SERVING 200. DO NOT PROMOTE THIS REPO.
const _edgeCryptoOff = (config, { nextRuntime }) => {
  if (nextRuntime === "edge") {
    config.resolve = config.resolve || {};
    config.resolve.fallback = { ...(config.resolve.fallback || {}), crypto: false };
  }
  return config;
};

module.exports = { ...nextConfig, webpack: _edgeCryptoOff };
