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


// 2026-08-30, THIRD PASS. The fallback is RESTORED, and this comment is the
// handover, because neither state of this file is shippable yet.
//
//   WITH the fallback:     build passes, every request returns 500.
//   WITHOUT the fallback:  build fails outright —
//     ./lib/platform-secrets/crypto.ts:15  Module not found: Can't resolve 'crypto'
//     import trace: instrumentation.ts -> env-shim -> getSecret -> vault/getSecret
//
// So the fallback is REQUIRED for the build and is not, on its own, the fix.
//
// WHAT IS PROVEN: the pre-upgrade 08-16 build serves 200 at its own URL and the
// Next 15 build served 500 — same app, same domain, only the framework differing.
// Production has been rolled back to that 08-16 deployment and is serving 200.
//
// WHAT IS NOT PROVEN: I attributed the 500 to this fallback removing the Web
// Crypto global that middleware needs — track.ts calls crypto.subtle.digest and
// its own comment says "Web Crypto, not node:crypto. This runs in Edge
// middleware." That is a PLAUSIBLE mechanism and I did not confirm it against a
// runtime log. Recorded as a hypothesis, not a finding.
//
// THE ACTUAL FIX is to stop instrumentation.ts dragging the vault into the edge
// compilation at all, rather than papering over the import once it is there. Next
// 15 compiles instrumentation for both runtimes and webpack resolves every import
// it finds, so the runtime guard inside register() does not help. Core hit the
// identical chain installing Sentry and solved it by removing the webpack plugin;
// that option does not exist here, because it is Next itself doing the compiling.
//
// DO NOT PROMOTE THIS REPO until that is resolved and a deployed build is verified
// serving 200. A green build is not evidence — this cost a live 500 to establish.
const _edgeCryptoOff = (config, { nextRuntime }) => {
  if (nextRuntime === "edge") {
    config.resolve = config.resolve || {};
    config.resolve.fallback = { ...(config.resolve.fallback || {}), crypto: false };
  }
  return config;
};

module.exports = { ...nextConfig, webpack: _edgeCryptoOff };
