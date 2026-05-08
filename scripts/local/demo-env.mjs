export const demoEnv = {
  API_INTERNAL_URL: "http://localhost:4000",
  API_PORT: "4000",
  API_URL: "http://localhost:4000",
  APP_ENV: "local",
  APP_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto",
  MAIL_FROM: "no-reply@adottaungatto.local",
  MAIL_HOST: "localhost",
  MAIL_PORT: "1025",
  NEXT_PUBLIC_API_URL: "http://localhost:4000",
  NEXT_PUBLIC_S3_BUCKET: "adottaungatto-local",
  NEXT_PUBLIC_S3_PUBLIC_ENDPOINT: "http://localhost:9000",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  POSTGRES_DB: "adottaungatto",
  POSTGRES_PASSWORD: "adottaungatto",
  POSTGRES_USER: "adottaungatto",
  REDIS_URL: "redis://localhost:6379",
  S3_ACCESS_KEY_ID: "minioadmin",
  S3_BUCKET: "adottaungatto-local",
  S3_ENDPOINT: "http://localhost:9000",
  S3_PUBLIC_ENDPOINT: "http://localhost:9000",
  S3_REGION: "local",
  S3_SECRET_ACCESS_KEY: "minioadmin",
  SESSION_SECRET: "local-demo-session-secret",
}

export function createDemoEnv() {
  return {
    ...process.env,
    ...demoEnv,
  }
}
