import { createHash } from "node:crypto"

import {
  createDatabase,
  geoImportRuns,
  geoImportStagedMunicipalities,
  geoImportStagedProvinces,
  geoImportStagedRegions,
} from "@workspace/db"
import type { Database } from "@workspace/db"
import { eq } from "drizzle-orm"
import * as XLSX from "xlsx"

type CellValue = string | number | boolean | null | undefined

type ProvinceType =
  | "province"
  | "metropolitan_city"
  | "free_municipal_consortium"
  | "autonomous_province"
  | "non_administrative_unit"

export type ItalianPlaceRegion = {
  istatCode: string
  name: string
  slug: string
  geographicalAreaCode: string
  geographicalAreaName: string
}

export type ItalianPlaceProvince = {
  regionIstatCode: string
  istatCode: string
  historicProvinceCode: string
  name: string
  type: ProvinceType
  slug: string
  vehicleCode: string | null
}

export type ItalianPlaceMunicipality = {
  regionIstatCode: string
  provinceIstatCode: string
  historicProvinceCode: string
  progressiveCode: string
  istatCode: string
  numericCode: string
  cadastralCode: string
  name: string
  italianName: string
  alternativeName: string | null
  slug: string
  nameNormalized: string
  isProvinceCapital: boolean
  nuts1_2021: string
  nuts2_2021: string
  nuts3_2021: string
  nuts1_2024: string
  nuts2_2024: string
  nuts3_2024: string
  rawData: Record<string, string>
}

export type ItalianPlacesDataset = {
  referenceDate: string
  sheetName: string
  regions: ItalianPlaceRegion[]
  provinces: ItalianPlaceProvince[]
  municipalities: ItalianPlaceMunicipality[]
  validationErrors: string[]
}

type ItalianPlacesImportOptions = {
  sourceUrl: string
  databaseUrl: string
  dryRun: boolean
  fetchFn?: typeof fetch
}

type DownloadedSource = {
  buffer: Buffer
  checksum: string
  bytes: number
  fetchedAt: Date
}

const importSourceName = "istat-elenco-comuni-italiani"

const columnMatchers = {
  regionCode: (header: string) => header === "Codice Regione",
  supraCode: (header: string) =>
    header.startsWith("Codice dell'Unità territoriale sovracomunale"),
  historicProvinceCode: (header: string) =>
    header.startsWith("Codice Provincia (Storico)"),
  municipalityProgressive: (header: string) =>
    header.startsWith("Progressivo del Comune"),
  municipalityIstatCode: (header: string) =>
    header === "Codice Comune formato alfanumerico",
  municipalityName: (header: string) =>
    header === "Denominazione (Italiana e straniera)",
  municipalityItalianName: (header: string) =>
    header === "Denominazione in italiano",
  municipalityAlternativeName: (header: string) =>
    header === "Denominazione altra lingua",
  geographicalAreaCode: (header: string) =>
    header === "Codice Ripartizione Geografica",
  geographicalAreaName: (header: string) =>
    header === "Ripartizione geografica",
  regionName: (header: string) => header === "Denominazione Regione",
  provinceName: (header: string) =>
    header.startsWith("Denominazione dell'Unità territoriale sovracomunale"),
  provinceType: (header: string) =>
    header.startsWith("Tipologia di Unità territoriale sovracomunale"),
  provinceCapitalFlag: (header: string) =>
    header.startsWith(
      "Flag Comune capoluogo di Provincia/Città metropolitana/libero consorzio"
    ),
  vehicleCode: (header: string) => header === "Sigla automobilistica",
  numericCode: (header: string) => header === "Codice Comune formato numerico",
  cadastralCode: (header: string) => header === "Codice Catastale del Comune",
  nuts1_2021: (header: string) => header === "Codice NUTS1 2021",
  nuts2_2021: (header: string) => header.startsWith("Codice NUTS2 2021"),
  nuts3_2021: (header: string) => header === "Codice NUTS3 2021",
  nuts1_2024: (header: string) => header === "Codice NUTS1 2024",
  nuts2_2024: (header: string) => header.startsWith("Codice NUTS2 2024"),
  nuts3_2024: (header: string) => header === "Codice NUTS3 2024",
} satisfies Record<string, (header: string) => boolean>

const provinceTypeByIstatCode: Record<string, ProvinceType> = {
  "1": "province",
  "2": "autonomous_province",
  "3": "metropolitan_city",
  "4": "free_municipal_consortium",
  "5": "non_administrative_unit",
}

export async function runItalianPlacesImport(
  options: ItalianPlacesImportOptions
) {
  const startedAt = new Date()
  const source = await downloadSource(options.sourceUrl, options.fetchFn)
  const dataset = parseItalianPlacesWorkbook(source.buffer)
  const finishedParsingAt = new Date()
  const summary = createImportSummary(dataset)

  if (options.dryRun) {
    return {
      job: "import-italian-places",
      mode: "dry-run",
      status: dataset.validationErrors.length === 0 ? "ok" : "invalid",
      source: createSourceSummary(options.sourceUrl, source),
      referenceDate: dataset.referenceDate,
      sheetName: dataset.sheetName,
      counts: summary.counts,
      validationErrors: dataset.validationErrors,
      database: {
        written: false,
        nextStep:
          "Run with --apply to write the import run and staging tables.",
      },
      timings: {
        startedAt: startedAt.toISOString(),
        finishedParsingAt: finishedParsingAt.toISOString(),
      },
    }
  }

  if (dataset.validationErrors.length > 0) {
    return {
      job: "import-italian-places",
      mode: "apply",
      status: "invalid",
      source: createSourceSummary(options.sourceUrl, source),
      referenceDate: dataset.referenceDate,
      sheetName: dataset.sheetName,
      counts: summary.counts,
      validationErrors: dataset.validationErrors,
      database: {
        written: false,
        reason: "Validation failed before staging.",
      },
    }
  }

  const { client, db } = createDatabase(options.databaseUrl)

  try {
    const importRunId = await stageItalianPlacesImport(db, {
      dataset,
      source,
      sourceUrl: options.sourceUrl,
      startedAt,
      finishedAt: new Date(),
      summary,
    })

    return {
      job: "import-italian-places",
      mode: "apply",
      status: "staged",
      importRunId,
      source: createSourceSummary(options.sourceUrl, source),
      referenceDate: dataset.referenceDate,
      sheetName: dataset.sheetName,
      counts: summary.counts,
      validationErrors: dataset.validationErrors,
      database: {
        written: true,
        stagedTables: [
          "geo_import_staged_regions",
          "geo_import_staged_provinces",
          "geo_import_staged_municipalities",
        ],
      },
    }
  } finally {
    await client.end()
  }
}

export function parseItalianPlacesWorkbook(
  buffer: Buffer
): ItalianPlacesDataset {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase().includes("codici")) ??
    workbook.SheetNames[0]

  if (!sheetName) {
    throw new Error("The workbook does not contain any sheets.")
  }

  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet) {
    throw new Error(`The sheet "${sheetName}" was not found in the workbook.`)
  }

  const rows = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  })

  return parseItalianPlacesRows(rows, sheetName)
}

export function parseItalianPlacesRows(
  rows: CellValue[][],
  sheetName = "CODICI"
): ItalianPlacesDataset {
  const [headerRow, ...bodyRows] = rows

  if (!headerRow) {
    throw new Error("The places sheet is empty.")
  }

  const headers = headerRow.map(normalizeHeader)
  const columns = getColumnIndexes(headers)
  const referenceDate = parseReferenceDateFromSheetName(sheetName)
  const regionsByCode = new Map<string, ItalianPlaceRegion>()
  const provincesByCode = new Map<string, ItalianPlaceProvince>()
  const municipalities: ItalianPlaceMunicipality[] = []
  const municipalityCodes = new Set<string>()
  const validationErrors: string[] = []

  bodyRows.forEach((row, rowIndex) => {
    if (row.every((value) => readCellValue(value).length === 0)) {
      return
    }

    const rowNumber = rowIndex + 2
    const provinceTypeCode = readCell(row, columns.provinceType)
    const provinceType = provinceTypeByIstatCode[provinceTypeCode]

    if (!provinceType) {
      validationErrors.push(
        `Row ${rowNumber}: unsupported province type "${provinceTypeCode}".`
      )
      return
    }

    const region: ItalianPlaceRegion = {
      istatCode: readCell(row, columns.regionCode),
      name: readCell(row, columns.regionName),
      slug: slugify(readCell(row, columns.regionName)),
      geographicalAreaCode: readCell(row, columns.geographicalAreaCode),
      geographicalAreaName: readCell(row, columns.geographicalAreaName),
    }

    const province: ItalianPlaceProvince = {
      regionIstatCode: region.istatCode,
      istatCode: readCell(row, columns.supraCode),
      historicProvinceCode: readCell(row, columns.historicProvinceCode),
      name: readCell(row, columns.provinceName),
      type: provinceType,
      slug: slugify(readCell(row, columns.provinceName)),
      vehicleCode: nullIfEmpty(readCell(row, columns.vehicleCode)),
    }

    const municipalityName = readCell(row, columns.municipalityName)
    const municipality: ItalianPlaceMunicipality = {
      regionIstatCode: region.istatCode,
      provinceIstatCode: province.istatCode,
      historicProvinceCode: province.historicProvinceCode,
      progressiveCode: readCell(row, columns.municipalityProgressive),
      istatCode: readCell(row, columns.municipalityIstatCode),
      numericCode: readCell(row, columns.numericCode),
      cadastralCode: readCell(row, columns.cadastralCode),
      name: municipalityName,
      italianName: readCell(row, columns.municipalityItalianName),
      alternativeName: nullIfEmpty(
        readCell(row, columns.municipalityAlternativeName)
      ),
      slug: slugify(municipalityName),
      nameNormalized: normalizeItalianText(municipalityName),
      isProvinceCapital: readCell(row, columns.provinceCapitalFlag) === "1",
      nuts1_2021: readCell(row, columns.nuts1_2021),
      nuts2_2021: readCell(row, columns.nuts2_2021),
      nuts3_2021: readCell(row, columns.nuts3_2021),
      nuts1_2024: readCell(row, columns.nuts1_2024),
      nuts2_2024: readCell(row, columns.nuts2_2024),
      nuts3_2024: readCell(row, columns.nuts3_2024),
      rawData: createRawData(headers, row),
    }

    const missingFields = getMissingRequiredFields(
      region,
      province,
      municipality
    )

    if (missingFields.length > 0) {
      validationErrors.push(
        `Row ${rowNumber}: missing required fields ${missingFields.join(", ")}.`
      )
      return
    }

    addConsistentRegion(regionsByCode, region, rowNumber, validationErrors)
    addConsistentProvince(
      provincesByCode,
      province,
      rowNumber,
      validationErrors
    )

    if (municipalityCodes.has(municipality.istatCode)) {
      validationErrors.push(
        `Row ${rowNumber}: duplicate municipality code ${municipality.istatCode}.`
      )
      return
    }

    municipalityCodes.add(municipality.istatCode)
    municipalities.push(municipality)
  })

  return {
    referenceDate,
    sheetName,
    regions: [...regionsByCode.values()],
    provinces: [...provincesByCode.values()],
    municipalities,
    validationErrors,
  }
}

export function createImportSummary(dataset: ItalianPlacesDataset) {
  const provinceTypes = dataset.provinces.reduce<Record<ProvinceType, number>>(
    (counts, province) => {
      counts[province.type] += 1
      return counts
    },
    {
      province: 0,
      metropolitan_city: 0,
      free_municipal_consortium: 0,
      autonomous_province: 0,
      non_administrative_unit: 0,
    }
  )

  return {
    counts: {
      regions: dataset.regions.length,
      provinces: dataset.provinces.length,
      municipalities: dataset.municipalities.length,
      validationErrors: dataset.validationErrors.length,
    },
    provinceTypes,
    sampleMunicipalities: dataset.municipalities
      .slice(0, 5)
      .map((municipality) => ({
        istatCode: municipality.istatCode,
        name: municipality.name,
        provinceIstatCode: municipality.provinceIstatCode,
        regionIstatCode: municipality.regionIstatCode,
      })),
  }
}

async function downloadSource(
  sourceUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<DownloadedSource> {
  const response = await fetchFn(sourceUrl)

  if (!response.ok) {
    throw new Error(
      `Failed to download Istat source: ${response.status} ${response.statusText}`
    )
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  return {
    buffer,
    checksum: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.byteLength,
    fetchedAt: new Date(),
  }
}

async function stageItalianPlacesImport(
  db: Database,
  input: {
    dataset: ItalianPlacesDataset
    source: DownloadedSource
    sourceUrl: string
    startedAt: Date
    finishedAt: Date
    summary: ReturnType<typeof createImportSummary>
  }
) {
  return db.transaction(async (tx) => {
    const [importRun] = await tx
      .insert(geoImportRuns)
      .values({
        sourceName: importSourceName,
        sourceUrl: input.sourceUrl,
        sourceChecksum: input.source.checksum,
        sourceBytes: input.source.bytes,
        sourceFetchedAt: input.source.fetchedAt,
        referenceDate: dateOnlyToUtcDate(input.dataset.referenceDate),
        status: "staged",
        summary: input.summary,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
      })
      .onConflictDoUpdate({
        target: geoImportRuns.sourceChecksum,
        set: {
          sourceName: importSourceName,
          sourceUrl: input.sourceUrl,
          sourceBytes: input.source.bytes,
          sourceFetchedAt: input.source.fetchedAt,
          referenceDate: dateOnlyToUtcDate(input.dataset.referenceDate),
          status: "staged",
          summary: input.summary,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
          updatedAt: new Date(),
        },
      })
      .returning({ id: geoImportRuns.id })

    if (!importRun) {
      throw new Error("Unable to create or update geo import run.")
    }

    await tx
      .delete(geoImportStagedMunicipalities)
      .where(eq(geoImportStagedMunicipalities.importRunId, importRun.id))
    await tx
      .delete(geoImportStagedProvinces)
      .where(eq(geoImportStagedProvinces.importRunId, importRun.id))
    await tx
      .delete(geoImportStagedRegions)
      .where(eq(geoImportStagedRegions.importRunId, importRun.id))

    for (const regionChunk of chunk(input.dataset.regions, 500)) {
      await tx.insert(geoImportStagedRegions).values(
        regionChunk.map((region) => ({
          importRunId: importRun.id,
          istatCode: region.istatCode,
          name: region.name,
          slug: region.slug,
          geographicalAreaCode: region.geographicalAreaCode,
          geographicalAreaName: region.geographicalAreaName,
        }))
      )
    }

    for (const provinceChunk of chunk(input.dataset.provinces, 500)) {
      await tx.insert(geoImportStagedProvinces).values(
        provinceChunk.map((province) => ({
          importRunId: importRun.id,
          regionIstatCode: province.regionIstatCode,
          istatCode: province.istatCode,
          historicProvinceCode: province.historicProvinceCode,
          name: province.name,
          type: province.type,
          slug: province.slug,
          vehicleCode: province.vehicleCode,
        }))
      )
    }

    for (const municipalityChunk of chunk(input.dataset.municipalities, 500)) {
      await tx.insert(geoImportStagedMunicipalities).values(
        municipalityChunk.map((municipality) => ({
          importRunId: importRun.id,
          regionIstatCode: municipality.regionIstatCode,
          provinceIstatCode: municipality.provinceIstatCode,
          historicProvinceCode: municipality.historicProvinceCode,
          progressiveCode: municipality.progressiveCode,
          istatCode: municipality.istatCode,
          numericCode: municipality.numericCode,
          cadastralCode: municipality.cadastralCode,
          name: municipality.name,
          italianName: municipality.italianName,
          alternativeName: municipality.alternativeName,
          slug: municipality.slug,
          nameNormalized: municipality.nameNormalized,
          isProvinceCapital: municipality.isProvinceCapital,
          nuts1_2021: municipality.nuts1_2021,
          nuts2_2021: municipality.nuts2_2021,
          nuts3_2021: municipality.nuts3_2021,
          nuts1_2024: municipality.nuts1_2024,
          nuts2_2024: municipality.nuts2_2024,
          nuts3_2024: municipality.nuts3_2024,
          rawData: municipality.rawData,
        }))
      )
    }

    return importRun.id
  })
}

function getColumnIndexes(headers: string[]) {
  return {
    regionCode: findColumn(headers, columnMatchers.regionCode),
    supraCode: findColumn(headers, columnMatchers.supraCode),
    historicProvinceCode: findColumn(
      headers,
      columnMatchers.historicProvinceCode
    ),
    municipalityProgressive: findColumn(
      headers,
      columnMatchers.municipalityProgressive
    ),
    municipalityIstatCode: findColumn(
      headers,
      columnMatchers.municipalityIstatCode
    ),
    municipalityName: findColumn(headers, columnMatchers.municipalityName),
    municipalityItalianName: findColumn(
      headers,
      columnMatchers.municipalityItalianName
    ),
    municipalityAlternativeName: findColumn(
      headers,
      columnMatchers.municipalityAlternativeName
    ),
    geographicalAreaCode: findColumn(
      headers,
      columnMatchers.geographicalAreaCode
    ),
    geographicalAreaName: findColumn(
      headers,
      columnMatchers.geographicalAreaName
    ),
    regionName: findColumn(headers, columnMatchers.regionName),
    provinceName: findColumn(headers, columnMatchers.provinceName),
    provinceType: findColumn(headers, columnMatchers.provinceType),
    provinceCapitalFlag: findColumn(
      headers,
      columnMatchers.provinceCapitalFlag
    ),
    vehicleCode: findColumn(headers, columnMatchers.vehicleCode),
    numericCode: findColumn(headers, columnMatchers.numericCode),
    cadastralCode: findColumn(headers, columnMatchers.cadastralCode),
    nuts1_2021: findColumn(headers, columnMatchers.nuts1_2021),
    nuts2_2021: findColumn(headers, columnMatchers.nuts2_2021),
    nuts3_2021: findColumn(headers, columnMatchers.nuts3_2021),
    nuts1_2024: findColumn(headers, columnMatchers.nuts1_2024),
    nuts2_2024: findColumn(headers, columnMatchers.nuts2_2024),
    nuts3_2024: findColumn(headers, columnMatchers.nuts3_2024),
  }
}

function findColumn(
  headers: string[],
  matcher: (header: string) => boolean
): number {
  const index = headers.findIndex(matcher)

  if (index === -1) {
    throw new Error(
      `Unable to find a required Istat column. Available columns: ${headers.join(
        ", "
      )}`
    )
  }

  return index
}

function addConsistentRegion(
  regionsByCode: Map<string, ItalianPlaceRegion>,
  region: ItalianPlaceRegion,
  rowNumber: number,
  validationErrors: string[]
) {
  const existing = regionsByCode.get(region.istatCode)

  if (existing && existing.name !== region.name) {
    validationErrors.push(
      `Row ${rowNumber}: region ${region.istatCode} has conflicting names "${existing.name}" and "${region.name}".`
    )
    return
  }

  regionsByCode.set(region.istatCode, region)
}

function addConsistentProvince(
  provincesByCode: Map<string, ItalianPlaceProvince>,
  province: ItalianPlaceProvince,
  rowNumber: number,
  validationErrors: string[]
) {
  const existing = provincesByCode.get(province.istatCode)

  if (existing && existing.name !== province.name) {
    validationErrors.push(
      `Row ${rowNumber}: province ${province.istatCode} has conflicting names "${existing.name}" and "${province.name}".`
    )
    return
  }

  provincesByCode.set(province.istatCode, province)
}

function getMissingRequiredFields(
  region: ItalianPlaceRegion,
  province: ItalianPlaceProvince,
  municipality: ItalianPlaceMunicipality
): string[] {
  const requiredFields: Array<[string, string]> = [
    ["region.istatCode", region.istatCode],
    ["region.name", region.name],
    ["province.istatCode", province.istatCode],
    ["province.name", province.name],
    ["municipality.istatCode", municipality.istatCode],
    ["municipality.name", municipality.name],
    ["municipality.numericCode", municipality.numericCode],
    ["municipality.cadastralCode", municipality.cadastralCode],
  ]

  return requiredFields
    .filter(([, value]) => value.length === 0)
    .map(([field]) => field)
}

function createSourceSummary(sourceUrl: string, source: DownloadedSource) {
  return {
    name: importSourceName,
    url: sourceUrl,
    checksumSha256: source.checksum,
    bytes: source.bytes,
    fetchedAt: source.fetchedAt.toISOString(),
  }
}

function createRawData(
  headers: string[],
  row: CellValue[]
): Record<string, string> {
  return Object.fromEntries(
    headers
      .map((header, index) => [header, readCell(row, index)] as const)
      .filter(([header]) => header.length > 0)
  )
}

function readCell(row: CellValue[], index: number): string {
  return readCellValue(row[index])
}

function readCellValue(value: CellValue): string {
  return String(value ?? "").trim()
}

function normalizeHeader(value: CellValue): string {
  return readCellValue(value).replace(/\s+/g, " ")
}

function normalizeItalianText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function slugify(value: string): string {
  return normalizeItalianText(value).replace(/\s+/g, "-")
}

function nullIfEmpty(value: string): string | null {
  return value.length > 0 ? value : null
}

function parseReferenceDateFromSheetName(sheetName: string): string {
  const match = /(\d{2})_(\d{2})_(\d{4})/.exec(sheetName)

  if (!match) {
    return new Date().toISOString().slice(0, 10)
  }

  const [, day, month, year] = match

  return `${year}-${month}-${day}`
}

function dateOnlyToUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}
