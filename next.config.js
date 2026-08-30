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


// 2026-08-30, FIFTH PASS. Three approaches tried, each failing differently, and
// the differences are what identify the right tool.
//
// THE PROBLEM: Next 15 compiles instrumentation.ts for the EDGE runtime. Webpack
// resolves every import it finds there, and the runtime guard inside register()
// cannot help because the guard runs AFTER resolution:
//
//   instrumentation.ts -> platform-secrets/env-shim -> getSecret
//                      -> vault/getSecret -> platform-secrets/crypto
//                      -> import { createCipheriv, ... } from "crypto"
//
//   1. resolve.fallback = { crypto: false }
//      Build passed, EVERY REQUEST 500'd in production. Too broad: it targets the
//      identifier `crypto` across the whole edge compilation, and middleware.ts
//      here calls crypto.subtle.digest — WEB Crypto, the edge global. track.ts
//      says so itself: "Web Crypto, not node:crypto. This runs in Edge middleware."
//
//   2. removing it entirely
//      Build failed on the import above.
//
//   3. resolve.alias['@/lib/platform-secrets/env-shim'] = false
//      Build failed with the IDENTICAL import trace — the alias never matched.
//      Webpack aliases are compared after tsconfig path mapping, so the '@/' form
//      is not what it sees.
//
// THE TOOL THAT FITS: IgnorePlugin with BOTH a resourceRegExp and a contextRegExp.
// It ignores the request `crypto` only when the importer sits under
// platform-secrets — the node crypto import in the vault is cut, and nothing else
// named crypto anywhere in the edge bundle is affected. That is the precision the
// first attempt lacked, and it is why the Web Crypto global survives.
//
// Safe because instrumentation.ts returns early off nodejs, so the vault is never
// executed on edge. It was only ever COMPILED there, which was the whole problem.
const _edgeVaultOff = (config, { nextRuntime, webpack }) => {
  if (nextRuntime === "edge") {
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^crypto$/,
        contextRegExp: /platform-secrets|lib[\\/]vault/,
      }),
    );
  }
  return config;
};

module.exports = { ...nextConfig, webpack: _edgeVaultOff };
