import { fileURLToPath } from "node:url"

import { PgClient } from "@effect/sql-pg"
import { describe, expect, layer } from "@effect/vitest"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { McpProtocol, McpServer, McpTest } from "effect/ai"
import { SqlError } from "effect/sql"

import { Citation, NAMESPACE } from "../src/Citations.ts"
import { SfDataHandlers } from "../src/Handlers.ts"
import { HousingRepo } from "../src/HousingRepo.ts"
import { SfDataToolkit } from "../src/Tools.ts"

const refused = new SqlError.SqlError({
  reason: new SqlError.ConnectionError({ cause: new Error("connection refused") })
})

const POSTGIS_IMAGE = "imresamu/postgis:17-3.5"
const FIXTURE = fileURLToPath(new URL("./fixtures/sf_data.sql", import.meta.url))

/** A throwaway PostGIS database holding the synthetic `sf_data` schema, and an in-memory MCP client for the server. */
class TestServer extends Context.Service<TestServer, McpTest.Client>()("test/TestServer") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const container = yield* Effect.acquireRelease(
        Effect.tryPromise(() =>
          new PostgreSqlContainer(POSTGIS_IMAGE)
            .withCopyFilesToContainer([{ source: FIXTURE, target: "/docker-entrypoint-initdb.d/zz-sf.sql" }])
            .start()
        ),
        (started) => Effect.promise(() => started.stop())
      )
      const registrations = McpServer.toolkit(SfDataToolkit).pipe(
        Layer.provide(SfDataHandlers),
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

layer(TestServer.layer, { timeout: 120_000 })("sf-data server", (it) => {
  it.effect("publishes every tool with an input and an output schema and a title", () =>
    Effect.gen(function* () {
      const client = yield* TestServer
      const { tools } = yield* client.listTools()
      expect(tools.map((t) => t.name).sort()).toEqual([
        "affordable_pipeline_projects",
        "affordable_pipeline_summary",
        "affordable_pipeline_units_by_income_band",
        "dataset_info",
        "development_pipeline_projects",
        "development_pipeline_summary",
        "eviction_grounds",
        "eviction_notice_counts",
        "project_hazard_exposure"
      ])
      for (const tool of tools) {
        expect(tool.outputSchema).toBeDefined()
        expect(tool.annotations?.title).toEqual(expect.any(String))
      }
    })
  )

  describe("development_pipeline_projects", () => {
    it.effect("treats a parameter sent as null as one not given", () =>
      Effect.gen(function* () {
        const content = yield* structured("development_pipeline_projects", {
          approvedBefore: "2020-01-01",
          status: null,
          neighborhood: null,
          supervisorDistrict: null,
          limit: null
        })
        expect(content["totalMatching"]).toBe(1)
      })
    )

    it.effect("filters the latest snapshot and reports days in status up to the snapshot's source version", () =>
      Effect.gen(function* () {
        const content = yield* structured("development_pipeline_projects", { approvedBefore: "2020-01-01" })
        expect(content["snapshot"]).toBe("2026 Q2")
        expect(content["totalMatching"]).toBe(1)
        const projects = Schema.decodeUnknownSync(
          Schema.Array(Schema.Struct({ projectKey: Schema.String, daysInStatus: Schema.Number }))
        )(content["projects"])
        expect(projects.map((p) => p.projectKey)).toEqual(["3800001:2019-000001PRJ:1"])
        expect(projects[0]?.daysInStatus).toBe(2634)
      })
    )

    it.effect("cites the dataset version, describing the selection in its locator", () =>
      Effect.gen(function* () {
        const content = yield* structured("development_pipeline_projects", { status: "PL Approved" })
        const [citation] = citationsOf(content)
        expect(citation?.sourceId).toBe("sf_data.development_pipeline@2026-08-28")
        expect(citation?.locator).toBe("Planning pipeline projects, with status PL Approved")
      })
    )

    it.effect("gives the same citation ID for the same query", () =>
      Effect.gen(function* () {
        const first = citationsOf(
          yield* structured("development_pipeline_projects", { status: "PL Approved", limit: 5 })
        )
        const second = citationsOf(
          yield* structured("development_pipeline_projects", { limit: 5, status: "PL Approved" })
        )
        expect(first[0]?.citationId).toBe(second[0]?.citationId)
      })
    )

    it.effect("returns an unknown neighborhood as an error result listing the valid values", () =>
      Effect.gen(function* () {
        const result = yield* call("development_pipeline_projects", { neighborhood: "Atlantis" })
        expect(result.isError).toBe(true)
        const text = JSON.stringify(result.content)
        expect(text).toContain("UnknownValue")
        expect(text).toContain("Castro/Upper Market")
      })
    )
  })

  it.effect("summarizes the development pipeline by status", () =>
    Effect.gen(function* () {
      const content = yield* structured("development_pipeline_summary", { groupBy: "status" })
      expect(content["groups"]).toEqual([
        { key: "BP Issued", projects: 1, netUnits: 12, affordableUnits: 0 },
        { key: "Construction", projects: 1, netUnits: 20, affordableUnits: 20 },
        { key: "PL Approved", projects: 1, netUnits: 40, affordableUnits: 8 }
      ])
    })
  )

  it.effect("lists affordable projects with units by income band", () =>
    Effect.gen(function* () {
      const content = yield* structured("affordable_pipeline_projects", { estimatedStartBefore: "2026-01-01" })
      expect(content["dataAsOf"]).toBe("2026-05-21")
      expect(content["projects"]).toEqual([
        {
          projectId: "2024-002",
          name: "Project 2024-002",
          status: "Construction",
          constructionStatus: "(5) First Construction Document Issued",
          neighborhood: "Castro/Upper Market",
          supervisorDistrict: 8,
          totalUnits: 50,
          affordableUnits: 50,
          unitsByAmi: [{ amiBand: "_50_ami", units: 50 }],
          estimatedConstructionStart: "2025-02-01",
          estimatedCompletion: "2026-12-01"
        }
      ])
    })
  )

  it.effect("totals affordable units by income band", () =>
    Effect.gen(function* () {
      const content = yield* structured("affordable_pipeline_units_by_income_band", {})
      expect(content["bands"]).toEqual([
        { amiBand: "_50_ami", projects: 2, unitsInBand: 110 },
        { amiBand: "_80_ami", projects: 1, unitsInBand: 39 }
      ])
    })
  )

  it.effect("totals affordable units by status", () =>
    Effect.gen(function* () {
      const content = yield* structured("affordable_pipeline_summary", { groupBy: "status" })
      expect(content["groups"]).toEqual([
        { key: "Construction", projects: 1, affordableUnits: 50 },
        { key: "Pre-Construction", projects: 1, affordableUnits: 99 }
      ])
    })
  )

  it.effect("reports projects inside a zone, counts those without a location, and cites both sources", () =>
    Effect.gen(function* () {
      const content = yield* structured("project_hazard_exposure", {
        zone: "sfpuc_100yr_storm",
        projects: "development_pipeline"
      })
      expect(content["projectsChecked"]).toBe(3)
      expect(content["projectsWithoutLocation"]).toBe(1)
      expect(content["totalInside"]).toBe(1)
      expect(content["unitsInside"]).toBe(40)
      expect(content["affordableUnitsInside"]).toBe(8)
      expect(citationsOf(content).map((c) => c.sourceId)).toEqual([
        "sf_data.development_pipeline@2026-08-28",
        "sf_data.sfpuc_100yr_storm@2025-12-12"
      ])
    })
  )

  it.effect("returns a zone that has not been loaded as DataUnavailable", () =>
    Effect.gen(function* () {
      const result = yield* call("project_hazard_exposure", {
        zone: "air_pollutant_exposure_zone",
        projects: "affordable_pipeline"
      })
      expect(result.isError).toBe(true)
      const text = JSON.stringify(result.content)
      expect(text).toContain("DataUnavailable")
      expect(text).toContain("air_pollutant_exposure_zone")
    })
  )

  describe("eviction_notice_counts", () => {
    it.effect("counts notices in the month range, and a notice once per ground when grouped by ground", () =>
      Effect.gen(function* () {
        const content = yield* structured("eviction_notice_counts", {
          from: "2024-01",
          to: "2025-08",
          groupBy: ["ground"]
        })
        expect(content["totalNotices"]).toBe(4)
        expect(content["dataAsOf"]).toBe("2026-11-06")
        expect(content["groups"]).toEqual([
          { key: { ground: "breach" }, notices: 2 },
          { key: { ground: "owner_move_in" }, notices: 2 }
        ])
        expect(citationsOf(content).map((c) => c.sourceId)).toEqual(["sf_data.eviction_notices@2026-11-06"])
      })
    )

    it.effect("filters to notices giving any listed ground, and groups by two fields", () =>
      Effect.gen(function* () {
        const content = yield* structured("eviction_notice_counts", {
          from: "2024-01",
          to: "2025-08",
          grounds: ["breach"],
          groupBy: ["year", "neighborhood"]
        })
        expect(content["totalNotices"]).toBe(2)
        expect(content["groups"]).toEqual([
          { key: { year: "2024", neighborhood: "Mission Bay" }, notices: 1 },
          { key: { year: "2025", neighborhood: "Castro/Upper Market" }, notices: 1 }
        ])
      })
    )

    it.effect("groups notices without a district as unknown", () =>
      Effect.gen(function* () {
        const content = yield* structured("eviction_notice_counts", {
          from: "2025-01",
          to: "2025-08",
          groupBy: ["district"]
        })
        expect(content["groups"]).toEqual([
          { key: { district: "8" }, notices: 1 },
          { key: { district: "unknown" }, notices: 1 }
        ])
      })
    )

    it.effect("returns months outside the data as PeriodOutOfRange with the months covered", () =>
      Effect.gen(function* () {
        const result = yield* call("eviction_notice_counts", { from: "2023-01", to: "2024-06" })
        expect(result.isError).toBe(true)
        const text = JSON.stringify(result.content)
        expect(text).toContain("PeriodOutOfRange")
        expect(text).toContain("2024-01")
        expect(text).toContain("2025-08")
      })
    )

    it.effect("returns an unknown ground as UnknownValue listing the ground keys", () =>
      Effect.gen(function* () {
        const result = yield* call("eviction_notice_counts", { from: "2024-01", to: "2024-12", grounds: ["eviction"] })
        expect(result.isError).toBe(true)
        const text = JSON.stringify(result.content)
        expect(text).toContain("UnknownValue")
        expect(text).toContain("owner_move_in")
      })
    )
  })

  it.effect("lists each ground with the report's label and section, citing the data and the report", () =>
    Effect.gen(function* () {
      const content = yield* structured("eviction_grounds", {})
      expect(content["grounds"]).toEqual([
        { key: "breach", label: "breach of rental agreement", section: "37.9(a)(2)" },
        { key: "other_cause", label: "other or no reason given", section: null },
        { key: "owner_move_in", label: "owner/relative move-in", section: "37.9(a)(8)" },
        { key: "roommate_same_unit", label: "roommate eviction", section: "37.9(b)" }
      ])
      expect(citationsOf(content).map((c) => c.sourceId)).toEqual([
        "sf_data.eviction_notices@2026-11-06",
        "sf_data.eviction_report@2026-04-08"
      ])
    })
  )

  it.effect("describes each dataset with the publisher's own description", () =>
    Effect.gen(function* () {
      const content = yield* structured("dataset_info", { dataset: "sfpuc_100yr_storm" })
      expect(content["datasets"]).toEqual([
        {
          key: "sfpuc_100yr_storm",
          title: "100-Year Storm Flood Risk Zone",
          publisher: null,
          sourceUrl:
            "https://gis.sfpuc.org/server/rest/services/Hosted/100_Year_Storm_Flood_Risk_Map_2024_Update/FeatureServer/2",
          license: null,
          sourceVersion: "2025-12-12",
          publisherDescription: "Stormwater flooding."
        }
      ])
    })
  )
})

/** A repo whose every query fails as one whose database refuses connections. */
const unreachableRepo = Layer.succeed(HousingRepo, {
  datasets: () => Effect.fail(refused),
  snapshot: () => Effect.fail(refused),
  developmentStatuses: () => Effect.fail(refused),
  affordableStatuses: () => Effect.fail(refused),
  neighborhoods: () => Effect.fail(refused),
  districts: () => Effect.fail(refused),
  developmentProjects: () => Effect.fail(refused),
  developmentSummary: () => Effect.fail(refused),
  affordableProjects: () => Effect.fail(refused),
  affordableSummary: () => Effect.fail(refused),
  affordableUnitsByIncomeBand: () => Effect.fail(refused),
  zone: () => Effect.fail(refused),
  exposure: () => Effect.fail(refused),
  evictionPeriod: () => Effect.fail(refused),
  evictionGroundKeys: () => Effect.fail(refused),
  evictionDistricts: () => Effect.fail(refused),
  evictionGrounds: () => Effect.fail(refused),
  evictionCounts: () => Effect.fail(refused)
})

class UnreachableServer extends Context.Service<UnreachableServer, McpTest.Client>()("test/UnreachableServer") {
  static readonly layer = Layer.effect(
    this,
    McpTest.makeClient(
      McpServer.toolkit(SfDataToolkit).pipe(Layer.provide(SfDataHandlers), Layer.provide(unreachableRepo)),
      { protocols: [McpProtocol.v2026_07_28] }
    )
  )
}

layer(UnreachableServer.layer)("sf-data server without its database", (it) => {
  it.effect("returns DatabaseUnavailable as an error result from every tool", () =>
    Effect.gen(function* () {
      const client = yield* UnreachableServer
      const calls: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
        ["development_pipeline_projects", {}],
        ["development_pipeline_summary", { groupBy: "status" }],
        ["affordable_pipeline_projects", {}],
        ["affordable_pipeline_summary", { groupBy: "status" }],
        ["affordable_pipeline_units_by_income_band", {}],
        ["project_hazard_exposure", { zone: "sfpuc_100yr_storm", projects: "development_pipeline" }],
        ["dataset_info", {}],
        ["eviction_notice_counts", { from: "2024-01", to: "2024-12" }],
        ["eviction_grounds", {}]
      ]
      for (const [name, args] of calls) {
        const result = yield* client.callTool({ name, arguments: args })
        expect(result.isError).toBe(true)
        expect(JSON.stringify(result.content)).toContain("DatabaseUnavailable")
      }
    })
  )
})
