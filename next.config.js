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


// 2026-08-30, FOURTH PASS — and this one is targeted rather than blanket.
//
// THE HISTORY, because both earlier attempts were wrong in instructive ways:
//
//   resolve.fallback { crypto: false } for edge
//     build PASSED, every request returned 500.
//   removing it
//     build FAILED — ./lib/platform-secrets/crypto.ts: Can't resolve 'crypto',
//     via instrumentation.ts -> env-shim -> getSecret -> vault/getSecret.
//
// PROVEN BY COMPARISON, not assumed. javari-social carries the identical fallback
// and serves 200 — because it has NO middleware, NO instrumentation and nothing
// touching crypto. It never exercised the fallback. This repo has all three: its
// middleware runs on EDGE and calls track(), which calls
// crypto.subtle.digest("SHA-256", data). track.ts says so itself: "Web Crypto, not
// node:crypto. This runs in Edge middleware."
//
// So `crypto: false` did exactly what it says — and resolve.fallback cannot tell a
// node IMPORT from the Web Crypto GLOBAL. It removed both.
//
// THE FIX: stub the VAULT MODULE for edge instead of the crypto builtin. The vault
// is the only thing dragging node crypto into the edge bundle, instrumentation
// already returns early off nodejs so edge never calls it, and the global is left
// completely alone — middleware keeps its Web Crypto.
const _edgeVaultStub = (config, { nextRuntime }) => {
  if (nextRuntime === "edge") {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // false makes webpack resolve this to an empty module for the edge
      // compilation only. Nothing on edge reaches it: instrumentation's register()
      // returns before touching the vault unless NEXT_RUNTIME is nodejs.
      "@/lib/vault/getSecret": false,
    };
  }
  return config;
};

module.exports = { ...nextConfig, webpack: _edgeVaultStub };
