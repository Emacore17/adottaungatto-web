import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto",
  },
  strict: true,
  verbose: true,
})
