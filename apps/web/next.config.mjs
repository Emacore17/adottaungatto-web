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

const imageRemotePatterns = [
  createRemotePattern(process.env.NEXT_PUBLIC_S3_PUBLIC_ENDPOINT),
  createRemotePattern(process.env.S3_PUBLIC_ENDPOINT),
  createRemotePattern("http://localhost:9000"),
].filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: imageRemotePatterns,
  },
  transpilePackages: ["@workspace/ui"],
}

export default nextConfig
