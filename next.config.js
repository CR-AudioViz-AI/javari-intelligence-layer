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


// 2026-08-30, SECOND PASS: THE EDGE CRYPTO FALLBACK IS REMOVED HERE, AND THIS
// REPO IS WHY THE PATTERN NEEDS A CONDITION.
//
// Applying `resolve.fallback = { crypto: false }` to the edge compilation made
// the build pass and made EVERY REQUEST RETURN 500. Verified against production:
// the pre-upgrade 08-16 build serves 200 at its own URL, the Next 15 build served
// 500, same app, same domain, only the framework differing. Rolled back to the
// 08-16 deployment; intelligence.craudiovizai.com is 200 again.
//
// The cause: middleware.ts runs on the EDGE runtime and calls track(), which does
//   const buf = await crypto.subtle.digest("SHA-256", data);
// That is WEB CRYPTO — the edge global — and track.ts says so in its own comment:
// "Web Crypto, not node:crypto. This runs in Edge middleware."
//
// The fallback exists to stop a NODE crypto IMPORT being dragged into an edge
// bundle. It also takes out the Web Crypto GLOBAL that edge middleware legitimately
// depends on. Build green, runtime dead.
//
// This repo does not need it: instrumentation.ts has no top-level imports and
// resolves the vault behind `if (NEXT_RUNTIME !== "nodejs") return;`, so nothing
// pulls node crypto into the edge compilation in the first place.
//
// THE RULE, for the other twelve: apply the fallback ONLY where the edge build
// actually fails without it, and NEVER where middleware uses Web Crypto. A green
// build is not evidence — this one proved that at the cost of a live 500.
module.exports = nextConfig;
