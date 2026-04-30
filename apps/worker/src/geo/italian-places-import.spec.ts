import { describe, expect, it } from "vitest"

import {
  createImportSummary,
  parseItalianPlacesRows,
} from "./italian-places-import.js"

const header = [
  "Codice Regione",
  "Codice dell'Unità territoriale sovracomunale \r\n(valida a fini statistici)",
  "Codice Provincia (Storico)(1)",
  "Progressivo del Comune (2)",
  "Codice Comune formato alfanumerico",
  "Denominazione (Italiana e straniera)",
  "Denominazione in italiano",
  "Denominazione altra lingua",
  "Codice Ripartizione Geografica",
  "Ripartizione geografica",
  "Denominazione Regione",
  "Denominazione dell'Unità territoriale sovracomunale \r\n(valida a fini statistici)",
  "Tipologia di Unità territoriale sovracomunale ",
  "Flag Comune capoluogo di Provincia/Città metropolitana/libero consorzio",
  "Sigla automobilistica",
  "Codice Comune formato numerico",
  "Codice Comune numerico con 107 Province (dal 2017 al 2025)",
  "Codice Comune numerico con 110 Province (dal 2010 al 2016)",
  "Codice Comune numerico con 107 Province (dal 2006 al 2009)",
  "Codice Comune numerico con 103 Province (dal 1995 al 2005)",
  "Codice Catastale del Comune",
  "Codice NUTS1 2021",
  "Codice NUTS2 2021 (3) ",
  "Codice NUTS3 2021",
  "Codice NUTS1 2024",
  "Codice NUTS2 2024 (3) ",
  "Codice NUTS3 2024",
]

describe("parseItalianPlacesRows", () => {
  it("parses Istat rows into regions, provinces and municipalities", () => {
    const dataset = parseItalianPlacesRows(
      [
        header,
        [
          "01",
          "201",
          "001",
          "001",
          "001001",
          "Agliè",
          "Agliè",
          "",
          "1",
          "Nord-ovest",
          "Piemonte",
          "Torino",
          "3",
          "0",
          "TO",
          "1001",
          "1001",
          "1001",
          "1001",
          "1001",
          "A074",
          "ITC",
          "ITC1",
          "ITC11",
          "ITC",
          "ITC1",
          "ITC11",
        ],
        [
          "01",
          "201",
          "001",
          "002",
          "001002",
          "Airasca",
          "Airasca",
          "",
          "1",
          "Nord-ovest",
          "Piemonte",
          "Torino",
          "3",
          "0",
          "TO",
          "1002",
          "1002",
          "1002",
          "1002",
          "1002",
          "A109",
          "ITC",
          "ITC1",
          "ITC11",
          "ITC",
          "ITC1",
          "ITC11",
        ],
      ],
      "CODICI al 21_02_2026"
    )

    expect(dataset.referenceDate).toBe("2026-02-21")
    expect(dataset.validationErrors).toEqual([])
    expect(dataset.regions).toHaveLength(1)
    expect(dataset.provinces).toEqual([
      expect.objectContaining({
        istatCode: "201",
        name: "Torino",
        type: "metropolitan_city",
      }),
    ])
    expect(dataset.municipalities).toEqual([
      expect.objectContaining({
        istatCode: "001001",
        name: "Agliè",
        slug: "aglie",
        nameNormalized: "aglie",
      }),
      expect.objectContaining({
        istatCode: "001002",
        name: "Airasca",
      }),
    ])

    expect(createImportSummary(dataset).counts).toEqual({
      regions: 1,
      provinces: 1,
      municipalities: 2,
      validationErrors: 0,
    })
  })

  it("reports duplicate municipality codes", () => {
    const row = [
      "01",
      "201",
      "001",
      "001",
      "001001",
      "Agliè",
      "Agliè",
      "",
      "1",
      "Nord-ovest",
      "Piemonte",
      "Torino",
      "3",
      "0",
      "TO",
      "1001",
      "1001",
      "1001",
      "1001",
      "1001",
      "A074",
      "ITC",
      "ITC1",
      "ITC11",
      "ITC",
      "ITC1",
      "ITC11",
    ]

    const dataset = parseItalianPlacesRows(
      [header, row, row],
      "CODICI al 21_02_2026"
    )

    expect(dataset.validationErrors).toEqual([
      "Row 3: duplicate municipality code 001001.",
    ])
  })
})
