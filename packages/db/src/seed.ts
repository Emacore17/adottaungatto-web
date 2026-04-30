import { sql } from "drizzle-orm"
import { pathToFileURL } from "node:url"

import { createDatabase } from "./client.js"
import { catBreeds, roles } from "./schema.js"
import { catBreedSeedRows, roleSeedRows } from "./seed-data.js"

const defaultDatabaseUrl =
  "postgresql://adottaungatto:adottaungatto@localhost:5432/adottaungatto"

export type SeedSummary = {
  dryRun: boolean
  roles: number
  catBreeds: number
}

export async function seedDatabase(
  databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl,
  options: { dryRun?: boolean } = {}
): Promise<SeedSummary> {
  const summary = {
    dryRun: options.dryRun ?? false,
    roles: roleSeedRows.length,
    catBreeds: catBreedSeedRows.length,
  }

  if (summary.dryRun) {
    return summary
  }

  const { client, db } = createDatabase(databaseUrl)

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(roles)
        .values(roleSeedRows.map((role) => ({ ...role })))
        .onConflictDoUpdate({
          target: roles.code,
          set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            updatedAt: sql`now()`,
          },
        })

      await tx
        .insert(catBreeds)
        .values(catBreedSeedRows.map((breed) => ({ ...breed })))
        .onConflictDoUpdate({
          target: catBreeds.slug,
          set: {
            name: sql`excluded.name`,
            synonyms: sql`excluded.synonyms`,
            isActive: sql`excluded.is_active`,
            sortOrder: sql`excluded.sort_order`,
            updatedAt: sql`now()`,
          },
        })
    })
  } finally {
    await client.end()
  }

  return summary
}

function isCliEntrypoint() {
  return (
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  )
}

if (isCliEntrypoint()) {
  const dryRun = process.argv.includes("--dry-run")

  seedDatabase(process.env.DATABASE_URL, { dryRun })
    .then((summary) => {
      console.log(
        JSON.stringify(
          {
            job: "db-seed",
            mode: dryRun ? "dry-run" : "apply",
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
            job: "db-seed",
            status: "error",
            message,
          },
          null,
          2
        )
      )
      process.exitCode = 1
    })
}
