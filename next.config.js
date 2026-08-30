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


// 2026-08-30, RESOLVED. No webpack override here, deliberately.
//
// The vault no longer reaches the edge compilation, because instrumentation.ts
// now follows Next's documented runtime-split pattern: the Node-only work lives
// in ./instrumentation-node and is imported inside the NEXT_RUNTIME guard. A
// dedicated file is a chunk boundary; the shared lib module it replaced was a
// static edge in webpack's graph that resolution followed regardless of the
// guard.
//
// THREE WEBPACK ATTEMPTS PRECEDED THIS AND ALL WERE WRONG IN PRINCIPLE:
//   resolve.fallback { crypto: false }  build passed, EVERY REQUEST 500'd — it
//     also removes the Web Crypto GLOBAL that this app's edge middleware uses
//     for crypto.subtle.digest. resolve.fallback cannot tell an import from a
//     global.
//   removing it                          build failed on the vault's crypto.
//   resolve.alias on "@/lib/vault/..."   never matched; tsconfig paths expand
//     the @/ prefix before webpack's alias is consulted.
//
// No bundler configuration fixes a static import chain. The chain had to stop
// existing, and Next's own documentation says exactly that: register() is called
// in every environment, so runtime-specific code must be conditionally imported
// from a dedicated file.
module.exports = nextConfig;
