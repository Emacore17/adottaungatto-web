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

/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

export default nextConfig
