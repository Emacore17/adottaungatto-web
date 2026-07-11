/* global process */

function createRemotePattern(url) {
  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)

    return {
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/**",
    }
  } catch {
    return null
  }
}

const isProduction = process.env.NODE_ENV === "production"
const imageRemotePatterns = [
  createRemotePattern(process.env.NEXT_PUBLIC_S3_PUBLIC_ENDPOINT),
  createRemotePattern(process.env.S3_PUBLIC_ENDPOINT),
  // Sorgente di sviluppo locale: esclusa in produzione.
  isProduction ? null : createRemotePattern("http://localhost:9000"),
].filter(Boolean)
const listingImageFormBodySizeLimit = "110mb"

// Header di sicurezza statici applicati a ogni risposta. La Content-Security-Policy
// non e' qui ma nel middleware (`apps/web/middleware.ts`): richiede un nonce
// per-richiesta che next.config non puo' generare.
const staticSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Non rivelare il framework/versione nell'header X-Powered-By.
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: listingImageFormBodySizeLimit,
    serverActions: {
      bodySizeLimit: listingImageFormBodySizeLimit,
    },
  },
  images: {
    remotePatterns: imageRemotePatterns,
  },
  transpilePackages: ["@workspace/ui", "@workspace/validation"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders,
      },
    ]
  },
}

export default nextConfig
