import { fileURLToPath } from "node:url"

import { PgClient } from "@effect/sql-pg"
import { describe, expect, layer } from "@effect/vitest"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { McpProtocol, McpTest } from "effect/ai"
import { SqlError } from "effect/sql"

import { Citation, NAMESPACE } from "../src/Citations.ts"
import { HousingRepo } from "../src/HousingRepo.ts"
import { RegistrationsLive } from "../src/Server.ts"

const refused = new SqlError.SqlError({
  reason: new SqlError.ConnectionError({ cause: new Error("connection refused") })
})

const POSTGIS_IMAGE = "imresamu/postgis:17-3.5"
const FIXTURE = fileURLToPath(new URL("./fixtures/ams_data.sql", import.meta.url))

/** A throwaway PostGIS database holding the synthetic `ams_data` schema, and an in-memory MCP client for the server. */
class TestServer extends Context.Service<TestServer, McpTest.Client>()("test/TestServer") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const container = yield* Effect.acquireRelease(
        Effect.tryPromise(() =>
          new PostgreSqlContainer(POSTGIS_IMAGE)
            .withCopyFilesToContainer([{ source: FIXTURE, target: "/docker-entrypoint-initdb.d/zz-ams.sql" }])
            .start()
        ),
        (started) => Effect.promise(() => started.stop())
      )
      const registrations = RegistrationsLive.pipe(
        Layer.provide(HousingRepo.layer),
        Layer.provide(PgClient.layer({ url: Redacted.make(container.getConnectionUri()) }))
      )
      return yield* McpTest.makeClient(registrations, { protocols: [McpProtocol.v2026_07_28] })
    })
  )
}

const call = Effect.fn("call")(function* (name: string, args: Record<string, unknown>) {
  const client = yield* TestServer
  return yield* client.callTool({ name, arguments: args })
})

/** A result's citations, decoded with the citation convention's schema, which checks their IDs. */
const citationsOf = (content: Readonly<Record<string, unknown>>) =>
  Schema.decodeUnknownSync(Schema.Array(Citation))(content["citations"])

/** A successful result's `structuredContent`, whose citations must follow the convention under this server's namespace. */
const structured = Effect.fn("structured")(function* (name: string, args: Record<string, unknown>) {
  const result = yield* call(name, args)
  expect(result.isError).toBe(false)
  const content = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(result.structuredContent)
  for (const citation of citationsOf(content)) expect(citation.sourceId.startsWith(`${NAMESPACE}.`)).toBe(true)
  return content
})

layer(TestServer.layer, { timeout: 120_000 })("ams-data server", (it) => {
  it.effect("publishes every tool with an input and an output schema and a title", () =>
    Effect.gen(function* () {
      const client = yield* TestServer
      const { tools } = yield* client.listTools()
      expect(tools.map((t) => t.name).sort()).toEqual(
        [
          "planned_housing_projects",
          "planned_housing_summary",
          "energy_labels_summary",
          "energy_label_at_address",
          "short_term_rentals",
          "short_term_rentals_summary",
          "housing_stock",
          "dataset_info"
        ].sort()
      )
      for (const tool of tools) {
        expect(tool.outputSchema).toBeDefined()
        expect(tool.annotations?.title).toEqual(expect.any(String))
      }
    })
  )

  describe("planned_housing_projects", () => {
    it.effect("treats a parameter sent as null as one not given", () =>
      Effect.gen(function* () {
        const content = yield* structured("planned_housing_projects", {
          district: null,
          neighborhood: null,
          minUnits: null,
          buildingFrom: null,
          limit: null
        })
        expect(content["totalMatching"]).toBe(4)
        expect(content["snapshot"]).toBe("2026-07-01")
      })
    )

    it.effect("groups the published tenure columns into the tenure totals it reports", () =>
      Effect.gen(function* () {
        const content = yield* structured("planned_housing_projects", { minUnits: 100 })
        const projects = Schema.decodeUnknownSync(
          Schema.Array(
            Schema.Struct({
              projectId: Schema.String,
              totalUnits: Schema.Number,
              plannedUnitsByTenure: Schema.Struct({
                socialRent: Schema.NullOr(Schema.Number),
                ownerOccupied: Schema.NullOr(Schema.Number)
              })
            })
          )
        )(content["projects"])
        expect(projects).toEqual([
          { projectId: "P1", totalUnits: 100, plannedUnitsByTenure: { socialRent: 40, ownerOccupied: 30 } }
        ])
      })
    )

    it.effect("finds a plan whose record names no district by the district of the neighborhood it names", () =>
      Effect.gen(function* () {
        const content = yield* structured("planned_housing_projects", { district: "Weesp" })
        const projects = Schema.decodeUnknownSync(
          Schema.Array(Schema.Struct({ projectId: Schema.String, district: Schema.NullOr(Schema.String) }))
        )(content["projects"])
        expect(projects.map((p) => [p.projectId, p.district])).toEqual([["P4", "Weesp"]])
      })
    )

    it.effect(
      "cites the register's version, its locator naming the district, and cites that district as its jurisdiction",
      () =>
        Effect.gen(function* () {
          const content = yield* structured("planned_housing_projects", { district: "Zuid" })
          const [citation] = citationsOf(content)
          expect(citation?.sourceId).toBe("ams_data.nieuwbouwplannen@2026-07-01")
          expect(citation?.locator).toBe("Amsterdam planned housing projects, in the district of Zuid")
          expect(citation?.jurisdiction).toBe("Zuid")
        })
    )

    it.effect("gives the same citation ID for the same query", () =>
      Effect.gen(function* () {
        const first = citationsOf(yield* structured("planned_housing_projects", { district: "Zuid", limit: 5 }))
        const second = citationsOf(yield* structured("planned_housing_projects", { limit: 5, district: "Zuid" }))
        expect(first[0]?.citationId).toBe(second[0]?.citationId)
      })
    )

    it.effect("returns an unknown district as an error result listing the valid values", () =>
      Effect.gen(function* () {
        const result = yield* call("planned_housing_projects", { district: "Atlantis" })
        expect(result.isError).toBe(true)
        const text = JSON.stringify(result.content)
        expect(text).toContain("UnknownValue")
        expect(text).toContain("Centrum")
      })
    )
  })

  it.effect(
    "summarizes the planned housing by district, taking a plan's district from its neighborhood when it names none",
    () =>
      Effect.gen(function* () {
        const content = yield* structured("planned_housing_summary", { groupBy: "district" })
        expect(content["groups"]).toEqual([
          {
            key: "Centrum",
            projects: 1,
            totalUnits: 30,
            unitsSocialRent: 30,
            unitsMidRent: 0,
            unitsPrivateRent: 0,
            unitsOwnerOccupied: 0,
            unitsOther: 0
          },
          {
            key: "Noord",
            projects: 1,
            totalUnits: 15,
            unitsSocialRent: 0,
            unitsMidRent: 0,
            unitsPrivateRent: 0,
            unitsOwnerOccupied: 0,
            unitsOther: 15
          },
          {
            key: "Weesp",
            projects: 1,
            totalUnits: 12,
            unitsSocialRent: 12,
            unitsMidRent: 0,
            unitsPrivateRent: 0,
            unitsOwnerOccupied: 0,
            unitsOther: 0
          },
          {
            key: "Zuid",
            projects: 1,
            totalUnits: 100,
            unitsSocialRent: 40,
            unitsMidRent: 20,
            unitsPrivateRent: 10,
            unitsOwnerOccupied: 30,
            unitsOther: 0
          }
        ])
      })
  )

  it.effect("summarizes the planned housing by year of planned construction start", () =>
    Effect.gen(function* () {
      const content = yield* structured("planned_housing_summary", { groupBy: "planned_start_year" })
      const groups = Schema.decodeUnknownSync(Schema.Array(Schema.Struct({ key: Schema.String })))(content["groups"])
      expect(groups.map((g) => g.key)).toEqual(["2026", "2027", "2028", "not planned"])
    })
  )

  it.effect("counts energy labels by class", () =>
    Effect.gen(function* () {
      const content = yield* structured("energy_labels_summary", { groupBy: "label_class" })
      expect(content["groups"]).toEqual([
        { key: "A", labels: 2 },
        { key: "B", labels: 1 },
        { key: "C", labels: 1 },
        { key: "G", labels: 1 }
      ])
      expect(content["dataAsOf"]).toBe("2026-11-01")
    })
  )

  it.effect("counts energy labels by construction period, counting a label without a build year as unknown", () =>
    Effect.gen(function* () {
      const content = yield* structured("energy_labels_summary", { groupBy: "build_year_band" })
      expect(content["groups"]).toEqual([
        { key: "1900 tot 1920", labels: 1 },
        { key: "1921 tot 1940", labels: 2 },
        { key: "2011 en later", labels: 1 },
        { key: "unknown", labels: 1 }
      ])
    })
  )

  it.effect("returns an unknown label class as an error result listing the classes loaded", () =>
    Effect.gen(function* () {
      const result = yield* call("energy_labels_summary", { groupBy: "label_class", labelClass: "Q" })
      expect(result.isError).toBe(true)
      expect(JSON.stringify(result.content)).toContain("UnknownValue")
    })
  )

  describe("energy_label_at_address", () => {
    it.effect(
      "gives every label registered at the address, newest registration first, whatever the case of the postcode",
      () =>
        Effect.gen(function* () {
          const content = yield* structured("energy_label_at_address", { postcode: "1011js", houseNumber: 1 })
          expect(content["found"]).toBe(true)
          const labels = Schema.decodeUnknownSync(
            Schema.Array(
              Schema.Struct({
                labelClass: Schema.String,
                registeredOn: Schema.String,
                surface: Schema.NullOr(Schema.Number)
              })
            )
          )(content["labels"])
          expect(labels).toEqual([
            { labelClass: "A", registeredOn: "2026-03-05", surface: 88.5 },
            { labelClass: "A", registeredOn: "2026-01-10", surface: 518 }
          ])
        })
    )
  })

  it.effect("says an address without a label holds none, not an error", () =>
    Effect.gen(function* () {
      const content = yield* structured("energy_label_at_address", { postcode: "1011JS", houseNumber: 9999 })
      expect(content["found"]).toBe(false)
      expect(content["labels"]).toEqual([])
    })
  )

  describe("short_term_rentals", () => {
    it.effect("treats a parameter sent as null as one not given", () =>
      Effect.gen(function* () {
        const content = yield* structured("short_term_rentals", {
          neighbourhood: null,
          roomType: null,
          registeredOnly: null,
          minNightlyPrice: null,
          limit: null
        })
        expect(content["totalMatching"]).toBe(4)
        expect(content["snapshot"]).toBe("2026-09-16")
      })
    )

    it.effect("lists the registered listings when asked, priciest first", () =>
      Effect.gen(function* () {
        const content = yield* structured("short_term_rentals", { registeredOnly: true })
        const listings = Schema.decodeUnknownSync(
          Schema.Array(
            Schema.Struct({
              listingId: Schema.String,
              registered: Schema.Boolean,
              registration: Schema.NullOr(Schema.String)
            })
          )
        )(content["listings"])
        expect(listings).toEqual([
          { listingId: "L4", registered: true, registration: "036341086EC3C2FF2493" },
          { listingId: "L1", registered: true, registration: "0363 78AD 8875 790E" }
        ])
      })
    )

    it.effect("returns an unknown room type as an error result listing the room types loaded", () =>
      Effect.gen(function* () {
        const result = yield* call("short_term_rentals", { roomType: "Houseboat" })
        expect(result.isError).toBe(true)
        expect(JSON.stringify(result.content)).toContain("UnknownValue")
      })
    )

    it.effect("summarizes the listings by neighborhood area with the nights they advertise", () =>
      Effect.gen(function* () {
        const content = yield* structured("short_term_rentals_summary", { groupBy: "neighbourhood" })
        expect(content["groups"]).toEqual([
          { key: "Centrum-West", listings: 3, nightsAvailable: 655, withRegistration: 2 },
          { key: "Zuid", listings: 1, nightsAvailable: 0, withRegistration: 0 }
        ])
      })
    )

    it.effect("summarizes the listings by room type", () =>
      Effect.gen(function* () {
        const content = yield* structured("short_term_rentals_summary", { groupBy: "room_type" })
        expect(content["groups"]).toEqual([
          { key: "Entire home/apt", listings: 2, nightsAvailable: 90, withRegistration: 1 },
          { key: "Hotel room", listings: 1, nightsAvailable: 200, withRegistration: 1 },
          { key: "Private room", listings: 1, nightsAvailable: 365, withRegistration: 0 }
        ])
      })
    )
  })

  describe("housing_stock", () => {
    it.effect("gives the city's own row when no level is named", () =>
      Effect.gen(function* () {
        const content = yield* structured("housing_stock", {})
        expect(content["totalMatching"]).toBe(1)
        expect(content["sourceVersion"]).toBe("2025-01-01")
        expect(content["areas"]).toMatchObject([
          { level: "gemeente", name: "Amsterdam", housingStock: 1000, pctRent: 70 }
        ])
      })
    )

    it.effect("looks one area up at its level", () =>
      Effect.gen(function* () {
        const content = yield* structured("housing_stock", { areaLevel: "wijk", area: "Zuidas" })
        expect(content["areas"]).toMatchObject([
          { level: "wijk", code: "KP", name: "Zuidas", housingStock: 600, pctCorporationOwned: 20 }
        ])
      })
    )

    it.effect("names the wijk a buurt stands in", () =>
      Effect.gen(function* () {
        const content = yield* structured("housing_stock", { areaLevel: "buurt", area: "Vivaldi" })
        expect(content["areas"]).toMatchObject([
          { level: "buurt", name: "Vivaldi", neighborhood: "Zuidas", housingStock: 400 }
        ])
      })
    )

    it.effect("ranks a level's areas by the measure asked for", () =>
      Effect.gen(function* () {
        const content = yield* structured("housing_stock", {
          areaLevel: "wijk",
          sortBy: "pct_corporation_owned"
        })
        const areas = content["areas"] as ReadonlyArray<{ name: string }>
        expect(areas.map((a) => a.name)).toEqual(["Nieuwendammerdijk", "Zuidas"])
      })
    )

    it.effect("returns an unknown area as an error result listing the names loaded", () =>
      Effect.gen(function* () {
        const result = yield* call("housing_stock", { areaLevel: "wijk", area: "Nieuw-West" })
        expect(result.isError).toBe(true)
        expect(JSON.stringify(result.content)).toContain("UnknownValue")
      })
    )
  })

  it.effect("offers only the loaded dataset keys to dataset_info", () =>
    Effect.gen(function* () {
      const { tools } = yield* (yield* TestServer).listTools()
      const input = JSON.stringify(tools.find((t) => t.name === "dataset_info")?.inputSchema)
      for (const key of ["ep_online_energielabels", "inside_airbnb_listings", "nieuwbouwplannen", "cbs_kerncijfers"]) {
        expect(input).toContain(`"${key}"`)
      }
      const invented = yield* call("dataset_info", { dataset: "planned_housing" })
      expect(invented.isError).toBe(true)
    })
  )

  it.effect("describes each dataset with the publisher's own description", () =>
    Effect.gen(function* () {
      const content = yield* structured("dataset_info", { dataset: "nieuwbouwplannen" })
      expect(content["datasets"]).toEqual([
        {
          key: "nieuwbouwplannen",
          title: "Woningbouwplannen Openbaar",
          publisher: "Gemeente Amsterdam",
          sourceUrl: "https://api.data.amsterdam.nl/v1/nieuwbouwplannen/woningbouwplannen_openbaar",
          license: "CC-BY",
          sourceVersion: "2026-07-01",
          publisherDescription: "De woningbouwplannen op de peildatum."
        }
      ])
    })
  )
})

/** A repo whose every query fails as one whose database refuses connections. */
const unreachableRepo = Layer.succeed(HousingRepo, {
  datasets: () => Effect.fail(refused),
  districts: () => Effect.fail(refused),
  neighborhoods: () => Effect.fail(refused),
  plannedSnapshot: () => Effect.fail(refused),
  plannedProjects: () => Effect.fail(refused),
  plannedSummary: () => Effect.fail(refused),
  labelClasses: () => Effect.fail(refused),
  buildYearBands: () => Effect.fail(refused),
  energyLabelsSummary: () => Effect.fail(refused),
  energyLabelAtAddress: () => Effect.fail(refused),
  rentalRoomTypes: () => Effect.fail(refused),
  rentalNeighbourhoods: () => Effect.fail(refused),
  rentalListings: () => Effect.fail(refused),
  rentalSummary: () => Effect.fail(refused),
  housingAreaNames: () => Effect.fail(refused),
  housingStock: () => Effect.fail(refused)
})

class UnreachableServer extends Context.Service<UnreachableServer, McpTest.Client>()("test/UnreachableServer") {
  static readonly layer = Layer.effect(
    this,
    McpTest.makeClient(RegistrationsLive.pipe(Layer.provide(unreachableRepo)), { protocols: [McpProtocol.v2026_07_28] })
  )
}

layer(UnreachableServer.layer)("ams-data server without its database", (it) => {
  it.effect("starts, with dataset_info taking any dataset key", () =>
    Effect.gen(function* () {
      const { tools } = yield* (yield* UnreachableServer).listTools()
      const input = JSON.stringify(tools.find((t) => t.name === "dataset_info")?.inputSchema)
      expect(input).not.toContain("enum")
      expect(input).not.toContain("const")
    })
  )

  it.effect("returns DatabaseUnavailable as an error result from every tool", () =>
    Effect.gen(function* () {
      const client = yield* UnreachableServer
      const calls: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
        ["planned_housing_projects", {}],
        ["planned_housing_summary", { groupBy: "district" }],
        ["energy_labels_summary", { groupBy: "label_class" }],
        ["energy_label_at_address", { postcode: "1011JS", houseNumber: 1 }],
        ["short_term_rentals", {}],
        ["short_term_rentals_summary", { groupBy: "room_type" }],
        ["dataset_info", {}]
      ]
      for (const [name, args] of calls) {
        const result = yield* client.callTool({ name, arguments: args })
        expect(result.isError).toBe(true)
        expect(JSON.stringify(result.content)).toContain("DatabaseUnavailable")
      }
    })
  )
})
