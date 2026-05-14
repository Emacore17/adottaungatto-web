import { existsSync } from "node:fs"
import { join } from "node:path"
import type { Readable } from "node:stream"
import { fileURLToPath, pathToFileURL } from "node:url"

import * as Minio from "minio"
import sharp from "sharp"

const bucket = process.env.S3_BUCKET ?? "adottaungatto-local"
const endpoint = new URL(process.env.S3_ENDPOINT ?? "http://localhost:9000")
const sourceImageDir =
  process.env.DEMO_CAT_IMAGES_DIR ||
  fileURLToPath(new URL("../../../../immagini-gattini/", import.meta.url))

const demoAssets = [
  {
    accent: "#9b5c7a",
    background: "#f6e9ef",
    key: "demo/listings/luna",
    label: "Luna",
    sourceImage: "gatto-2.jpg",
  },
  {
    accent: "#6f5874",
    background: "#eee9f4",
    key: "demo/listings/miro",
    label: "Miro",
    sourceImage: "gatto-4.jpg",
  },
  {
    accent: "#5d5c63",
    background: "#ececed",
    key: "demo/listings/nebbia",
    label: "Nebbia",
    sourceImage: "gatto-5.webp",
  },
  {
    accent: "#7d6a55",
    background: "#f0ebe4",
    key: "demo/listings/pepe",
    label: "Pepe",
    sourceImage: "gatto-6.webp",
  },
  {
    accent: "#8c5f5b",
    background: "#f4e9e5",
    key: "demo/listings/nina",
    label: "Nina",
    sourceImage: "gatto-7.webp",
  },
  {
    accent: "#5f6f51",
    background: "#edf2e8",
    key: "demo/listings/artu",
    label: "Artu",
    sourceImage: "gatto-8.jpg",
  },
  {
    accent: "#b26a2e",
    background: "#f7eadc",
    key: "demo/listings/sole",
    label: "Sole",
    sourceImage: "gatto-9.jpg",
  },
  {
    accent: "#4f6d68",
    background: "#e6efed",
    key: "demo/listings/oliva",
    label: "Oliva",
    sourceImage: "gatto-10.jpg",
  },
  {
    accent: "#8b6f38",
    background: "#f3edda",
    key: "demo/listings/leo",
    label: "Leo",
    sourceImage: "gatto-11.jpeg",
  },
  {
    accent: "#7c5f93",
    background: "#eee7f4",
    key: "demo/listings/zara",
    label: "Zara",
    sourceImage: "gatto-14.jpg",
  },
  {
    accent: "#55779d",
    background: "#e6eef7",
    key: "demo/listings/timo",
    label: "Timo",
    sourceImage: "gatto-15.jpg",
  },
] as const

const assetVariants = [
  {
    height: 900,
    suffix: ".png",
    width: 1200,
  },
  {
    height: 900,
    suffix: "-large.png",
    width: 1200,
  },
  {
    height: 360,
    suffix: "-thumb.png",
    width: 480,
  },
] as const

type DemoAssetSummary = {
  bucket: string
  objects: number
  placeholderImages: number
  sourceImageDir: string
  sourceImages: number
  verifiedObjects: number
}

type DemoImageOptions = {
  accent: string
  background: string
  height: number
  label: string
  width: number
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
  let placeholderImages = 0
  let sourceImages = 0

  for (const asset of demoAssets) {
    const sourcePath = resolveSourceImagePath(asset.sourceImage)

    if (sourcePath) {
      sourceImages += 1
    } else {
      placeholderImages += 1
    }

    const large = await createAssetImage({
      accent: asset.accent,
      background: asset.background,
      height: 900,
      label: asset.label,
      sourcePath,
      width: 1200,
    })
    const thumb = await createAssetImage({
      accent: asset.accent,
      background: asset.background,
      height: 360,
      label: asset.label,
      sourcePath,
      width: 480,
    })

    await putObject(client, `${asset.key}.png`, large)
    await putObject(client, `${asset.key}-large.png`, large)
    await putObject(client, `${asset.key}-thumb.png`, thumb)
    objects += 3
  }

  const verifiedObjects = await verifyDemoAssetObjects(client)

  return {
    bucket,
    objects,
    placeholderImages,
    sourceImageDir,
    sourceImages,
    verifiedObjects,
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

function resolveSourceImagePath(fileName: string) {
  const imagePath = join(sourceImageDir, fileName)

  return existsSync(imagePath) ? imagePath : null
}

async function createAssetImage(
  options: DemoImageOptions & {
    sourcePath: string | null
  }
) {
  if (options.sourcePath) {
    return sharp(options.sourcePath)
      .rotate()
      .resize(options.width, options.height, {
        fit: "cover",
        position: "attention",
      })
      .png()
      .toBuffer()
  }

  return createDemoImage(options)
}

async function createDemoImage(options: DemoImageOptions) {
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

async function verifyDemoAssetObjects(client: Minio.Client) {
  let verifiedObjects = 0

  for (const asset of demoAssets) {
    for (const variant of assetVariants) {
      await verifyDemoAssetObject(client, `${asset.key}${variant.suffix}`, {
        height: variant.height,
        width: variant.width,
      })
      verifiedObjects += 1
    }
  }

  return verifiedObjects
}

async function verifyDemoAssetObject(
  client: Minio.Client,
  objectKey: string,
  expected: Pick<DemoImageOptions, "height" | "width">
) {
  const objectStream = await client.getObject(bucket, objectKey)
  const buffer = await streamToBuffer(objectStream)
  const metadata = await sharp(buffer).metadata()

  if (metadata.format !== "png") {
    throw new Error(
      `Demo asset ${objectKey} has format ${metadata.format ?? "unknown"}.`
    )
  }

  if (
    metadata.width !== expected.width ||
    metadata.height !== expected.height
  ) {
    throw new Error(
      `Demo asset ${objectKey} is ${metadata.width ?? "unknown"}x${
        metadata.height ?? "unknown"
      }, expected ${expected.width}x${expected.height}.`
    )
  }
}

async function streamToBuffer(stream: Readable) {
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
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
