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
            // 2026-09-02: added after an ecosystem sweep found 58 of 60 live sites
            // with no CSP and weak HSTS. The other four headers here have been right
            // since August; these two were never added.
            //
            // HSTS is enforced immediately - it only instructs the browser to refuse
            // plaintext, so there is nothing for it to break.
            //
            // CSP ships REPORT-ONLY first, deliberately. A policy that blocks a script
            // the app actually needs takes the app down, and 48 apps received this in
            // one pass. Report-Only produces the same violation reports with none of
            // the blocking, so the policy is corrected from evidence rather than from
            // a guess about what each app loads. It graduates to enforcing once the
            // reports are quiet.
            //
            // Backticks, not quotes: the policy contains 'self' and a single-quoted
            // JS string cannot hold it. The first version of this patch produced
            // 48 syntactically invalid configs, caught by parsing one before pushing.
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            { key: 'Content-Security-Policy-Report-Only', value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.paypal.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.paypal.com; frame-src 'self' https://js.stripe.com https://*.paypal.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` },
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
