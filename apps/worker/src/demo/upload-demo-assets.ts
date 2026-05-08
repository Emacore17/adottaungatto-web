import { pathToFileURL } from "node:url"

import * as Minio from "minio"
import sharp from "sharp"

const bucket = process.env.S3_BUCKET ?? "adottaungatto-local"
const endpoint = new URL(process.env.S3_ENDPOINT ?? "http://localhost:9000")

const demoAssets = [
  {
    accent: "#9b5c7a",
    background: "#f6e9ef",
    key: "demo/listings/luna",
    label: "Luna",
  },
  {
    accent: "#6f5874",
    background: "#eee9f4",
    key: "demo/listings/miro",
    label: "Miro",
  },
  {
    accent: "#5d5c63",
    background: "#ececed",
    key: "demo/listings/nebbia",
    label: "Nebbia",
  },
  {
    accent: "#7d6a55",
    background: "#f0ebe4",
    key: "demo/listings/pepe",
    label: "Pepe",
  },
  {
    accent: "#8c5f5b",
    background: "#f4e9e5",
    key: "demo/listings/nina",
    label: "Nina",
  },
] as const

type DemoAssetSummary = {
  bucket: string
  objects: number
}

async function uploadDemoAssets(): Promise<DemoAssetSummary> {
  const client = new Minio.Client({
    accessKey: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
    endPoint: endpoint.hostname,
    port: endpoint.port ? Number(endpoint.port) : undefined,
    secretKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
    useSSL: endpoint.protocol === "https:",
  })

  const exists = await client.bucketExists(bucket).catch(() => false)

  if (!exists) {
    await client.makeBucket(bucket, process.env.S3_REGION ?? "local")
  }

  await client.setBucketPolicy(bucket, createPublicReadPolicy(bucket))

  let objects = 0

  for (const asset of demoAssets) {
    const large = await createDemoImage({
      accent: asset.accent,
      background: asset.background,
      height: 900,
      label: asset.label,
      width: 1200,
    })
    const thumb = await createDemoImage({
      accent: asset.accent,
      background: asset.background,
      height: 360,
      label: asset.label,
      width: 480,
    })

    await putObject(client, `${asset.key}.png`, large)
    await putObject(client, `${asset.key}-large.png`, large)
    await putObject(client, `${asset.key}-thumb.png`, thumb)
    objects += 3
  }

  return {
    bucket,
    objects,
  }
}

function createPublicReadPolicy(targetBucket: string) {
  return JSON.stringify({
    Statement: [
      {
        Action: ["s3:GetObject"],
        Effect: "Allow",
        Principal: "*",
        Resource: [`arn:aws:s3:::${targetBucket}/*`],
      },
    ],
    Version: "2012-10-17",
  })
}

async function createDemoImage(options: {
  accent: string
  background: string
  height: number
  label: string
  width: number
}) {
  const overlay = Buffer.from(`
    <svg width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="0" fill="${options.background}" />
      <circle cx="${options.width * 0.5}" cy="${options.height * 0.43}" r="${Math.round(options.height * 0.18)}" fill="${options.accent}" opacity="0.16" />
      <path d="M ${options.width * 0.42} ${options.height * 0.42} C ${options.width * 0.34} ${options.height * 0.26}, ${options.width * 0.3} ${options.height * 0.25}, ${options.width * 0.33} ${options.height * 0.45} C ${options.width * 0.25} ${options.height * 0.5}, ${options.width * 0.29} ${options.height * 0.67}, ${options.width * 0.44} ${options.height * 0.61} C ${options.width * 0.52} ${options.height * 0.67}, ${options.width * 0.68} ${options.height * 0.58}, ${options.width * 0.61} ${options.height * 0.45} C ${options.width * 0.68} ${options.height * 0.28}, ${options.width * 0.6} ${options.height * 0.27}, ${options.width * 0.55} ${options.height * 0.42} Z" fill="${options.accent}" opacity="0.84" />
      <circle cx="${options.width * 0.45}" cy="${options.height * 0.48}" r="${Math.round(options.height * 0.012)}" fill="${options.background}" />
      <circle cx="${options.width * 0.55}" cy="${options.height * 0.48}" r="${Math.round(options.height * 0.012)}" fill="${options.background}" />
      <text x="50%" y="${options.height * 0.82}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${Math.round(options.height * 0.08)}" font-weight="700" fill="${options.accent}">${options.label}</text>
    </svg>
  `)

  return sharp({
    create: {
      background: options.background,
      channels: 3,
      height: options.height,
      width: options.width,
    },
  })
    .composite([{ input: overlay }])
    .png()
    .toBuffer()
}

function putObject(client: Minio.Client, objectKey: string, data: Buffer) {
  return client.putObject(bucket, objectKey, data, data.byteLength, {
    "Content-Type": "image/png",
  })
}

function isCliEntrypoint() {
  return (
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  )
}

if (isCliEntrypoint()) {
  uploadDemoAssets()
    .then((summary) => {
      console.log(
        JSON.stringify(
          {
            job: "demo-assets",
            status: "ok",
            ...summary,
          },
          null,
          2
        )
      )
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)

      console.error(
        JSON.stringify(
          {
            job: "demo-assets",
            message,
            status: "error",
          },
          null,
          2
        )
      )
      process.exitCode = 1
    })
}
