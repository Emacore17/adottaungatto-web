import { describe, expect, it } from "vitest"

import type { ApiEnv } from "../config/env.js"
import {
  createClientOptions,
  createListingImageObjectKey,
  rewriteUrlOrigin,
} from "./object-storage.service.js"

describe("ObjectStorageService helpers", () => {
  it("creates MinIO client options from API env", () => {
    expect(
      createClientOptions({
        ...testEnv,
        S3_ENDPOINT: "http://localhost:9000",
      })
    ).toMatchObject({
      endPoint: "localhost",
      port: 9000,
      useSSL: false,
      accessKey: "access-key",
      secretKey: "secret-key",
      region: "local",
      pathStyle: true,
    })
  })

  it("rewrites signed URLs to the public endpoint", () => {
    expect(
      rewriteUrlOrigin(
        "http://minio:9000/adottaungatto-local/key.jpg?X-Amz-Signature=abc",
        "http://localhost:9000"
      )
    ).toBe(
      "http://localhost:9000/adottaungatto-local/key.jpg?X-Amz-Signature=abc"
    )
  })

  it("creates non-guessable listing image object keys", () => {
    expect(
      createListingImageObjectKey(
        "Local Dev",
        "00000000-0000-0000-0000-000000000001",
        "image/webp"
      )
    ).toMatch(
      /^local-dev\/listings\/00000000-0000-0000-0000-000000000001\/original\/[a-f0-9]{32}\.webp$/
    )
  })
})

const testEnv: ApiEnv = {
  API_PORT: 4000,
  APP_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto",
  EMAIL_VERIFICATION_TTL_MINUTES: 60,
  MAIL_FROM: "no-reply@adottaungatto.local",
  MAIL_HOST: "localhost",
  MAIL_PORT: 1025,
  PASSWORD_RESET_TTL_MINUTES: 30,
  REDIS_URL: "redis://localhost:6379",
  S3_ACCESS_KEY_ID: "access-key",
  S3_BUCKET: "adottaungatto-local",
  S3_ENDPOINT: "http://localhost:9000",
  S3_PUBLIC_ENDPOINT: "http://localhost:9000",
  S3_REGION: "local",
  S3_SECRET_ACCESS_KEY: "secret-key",
}
