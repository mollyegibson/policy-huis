import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"
import type { Fragment } from "effect/sql/Statement"

const NullableText = Schema.NullOr(Schema.String)
const NullableInt = Schema.NullOr(Schema.Int)

export const DatasetRow = Schema.Struct({
  datasetKey: Schema.String,
  title: Schema.String,
  publisher: NullableText,
  sourceUrl: Schema.String,
  license: NullableText,
  sourceVersion: Schema.String,
  publisherDescription: NullableText
})
export type DatasetRow = typeof DatasetRow.Type

export const DevelopmentProjectRow = Schema.Struct({
  projectKey: Schema.String,
  blockLot: Schema.String,
  nameOrAddress: Schema.String,
  status: Schema.String,
  statusSince: NullableText,
  daysInStatus: NullableInt,
  planningApprovedOn: NullableText,
  netUnits: NullableInt,
  affordableUnits: NullableInt,
  unitsExtremelyLow: NullableInt,
  unitsVeryLow: NullableInt,
  unitsLow: NullableInt,
  unitsModerate: NullableInt,
  neighborhood: NullableText,
  supervisorDistrict: NullableInt
})
export type DevelopmentProjectRow = typeof DevelopmentProjectRow.Type

export const AffordableProjectRow = Schema.Struct({
  projectId: Schema.String,
  name: Schema.String,
  status: Schema.String,
  constructionStatus: Schema.String,
  neighborhood: Schema.String,
  supervisorDistrict: Schema.Int,
  totalUnits: Schema.Int,
  affordableUnits: Schema.Int,
  estimatedConstructionStart: NullableText,
  estimatedCompletion: NullableText,
  unitsByAmi: Schema.Array(Schema.Struct({ amiBand: Schema.String, units: Schema.Int }))
})
export type AffordableProjectRow = typeof AffordableProjectRow.Type

const GroupRow = Schema.Struct({
  key: Schema.String,
  projects: Schema.Int,
  netUnits: Schema.Int,
  affordableUnits: Schema.Int
})

const AffordableGroupRow = Schema.Struct({ key: Schema.String, projects: Schema.Int, units: Schema.Int })

export const ZoneRow = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  publisher: NullableText,
  sourceEditedAt: Schema.String,
  publisherDescription: NullableText
})
export type ZoneRow = typeof ZoneRow.Type

const ExposureTotalsRow = Schema.Struct({
  projectsChecked: Schema.Int,
  projectsWithoutLocation: Schema.Int,
  totalInside: Schema.Int,
  unitsInside: Schema.Int,
  affordableUnitsInside: Schema.Int
})

const ExposedProjectRow = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.String,
  affordableUnits: Schema.Int
})

const Value = Schema.Struct({ value: Schema.String })
const Count = Schema.Struct({ total: Schema.Int })

export interface DevelopmentFilters {
  readonly status?: string | undefined
  readonly neighborhood?: string | undefined
  readonly supervisorDistrict?: number | undefined
  readonly minAffordableUnits?: number | undefined
  readonly inStatusSinceBefore?: string | undefined
  readonly approvedBefore?: string | undefined
}

export interface AffordableFilters {
  readonly status?: string | undefined
  readonly neighborhood?: string | undefined
  readonly supervisorDistrict?: number | undefined
  readonly minUnits?: number | undefined
  readonly estimatedStartBefore?: string | undefined
}

export type DevelopmentGroupBy = "status" | "neighborhood" | "district" | "approval_year"
export type AffordableGroupBy = "status" | "construction_status" | "neighborhood" | "district" | "ami_band"
export type ProjectSource = "development_pipeline" | "affordable_pipeline"

/** Read-only queries over the `sf` schema that the San Francisco ingestion project builds. */
export class HousingRepo extends Context.Service<HousingRepo>()("HousingRepo", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const rows = <S extends Schema.Top>(schema: S) => Schema.decodeUnknownEffect(Schema.Array(schema))
    const where = (clauses: ReadonlyArray<Fragment>) => (clauses.length === 0 ? sql`TRUE` : sql.and(clauses))

    const latestSnapshot = sql`(SELECT max(snapshot) FROM sf.development_pipeline)`

    const datasets = Effect.fn("HousingRepo.datasets")(function* () {
      return yield* rows(DatasetRow)(
        yield* sql`
          SELECT dataset_key AS "datasetKey", title, publisher, source_url AS "sourceUrl", license,
                 source_version::text AS "sourceVersion", publisher_description AS "publisherDescription"
          FROM sf.datasets ORDER BY dataset_key`
      )
    })

    const values = Effect.fn("HousingRepo.values")(function* (query: Fragment) {
      const found = yield* rows(Value)(yield* sql`SELECT DISTINCT value FROM (${query}) AS v WHERE value IS NOT NULL`)
      return found.map((r) => r.value).sort()
    })

    const developmentStatuses = () =>
      values(sql`SELECT status AS value FROM sf.development_pipeline WHERE snapshot = ${latestSnapshot}`)
    const affordableStatuses = () => values(sql`SELECT status AS value FROM sf.affordable_pipeline`)
    const neighborhoods = () => values(sql`SELECT name AS value FROM sf.neighborhoods`)
    const districts = () =>
      values(sql`
        SELECT supervisor_district::text AS value FROM sf.development_pipeline
        UNION SELECT supervisor_district::text FROM sf.affordable_pipeline`)

    const snapshot = Effect.fn("HousingRepo.snapshot")(function* () {
      const [row] = yield* rows(Value)(yield* sql`SELECT ${latestSnapshot} AS value`)
      return row?.value ?? null
    })

    const developmentWhere = (f: DevelopmentFilters) =>
      where([
        sql`snapshot = ${latestSnapshot}`,
        ...(f.status === undefined ? [] : [sql`status = ${f.status}`]),
        ...(f.neighborhood === undefined ? [] : [sql`neighborhood = ${f.neighborhood}`]),
        ...(f.supervisorDistrict === undefined ? [] : [sql`supervisor_district = ${f.supervisorDistrict}`]),
        ...(f.minAffordableUnits === undefined ? [] : [sql`affordable_units >= ${f.minAffordableUnits}`]),
        ...(f.inStatusSinceBefore === undefined ? [] : [sql`status_since < ${f.inStatusSinceBefore}::date`]),
        ...(f.approvedBefore === undefined ? [] : [sql`planning_approved_on < ${f.approvedBefore}::date`])
      ])

    const developmentProjects = Effect.fn("HousingRepo.developmentProjects")(function* (
      filters: DevelopmentFilters,
      limit: number
    ) {
      const condition = developmentWhere(filters)
      const [count] = yield* rows(Count)(
        yield* sql`SELECT count(*)::int AS total FROM sf.development_pipeline WHERE ${condition}`
      )
      const projects = yield* rows(DevelopmentProjectRow)(
        yield* sql`
          SELECT project_key AS "projectKey", block_lot AS "blockLot", name_or_address AS "nameOrAddress", status,
                 status_since::text AS "statusSince", (current_date - status_since) AS "daysInStatus",
                 planning_approved_on::text AS "planningApprovedOn", net_units AS "netUnits",
                 affordable_units AS "affordableUnits", units_extremely_low AS "unitsExtremelyLow",
                 units_very_low AS "unitsVeryLow", units_low AS "unitsLow", units_moderate AS "unitsModerate",
                 neighborhood, supervisor_district AS "supervisorDistrict"
          FROM sf.development_pipeline
          WHERE ${condition}
          ORDER BY status_since NULLS LAST, project_key
          LIMIT ${limit}`
      )
      return { total: count?.total ?? 0, projects }
    })

    const developmentSummary = Effect.fn("HousingRepo.developmentSummary")(function* (
      groupBy: DevelopmentGroupBy,
      status: string | undefined,
      affordableOnly: boolean
    ) {
      const key = {
        status: sql`status`,
        neighborhood: sql`coalesce(neighborhood, 'unknown')`,
        district: sql`coalesce(supervisor_district::text, 'unknown')`,
        approval_year: sql`coalesce(extract(year FROM planning_approved_on)::int::text, 'not approved')`
      }[groupBy]
      return yield* rows(GroupRow)(
        yield* sql`
          SELECT ${key} AS key, count(*)::int AS projects,
                 coalesce(sum(net_units), 0)::int AS "netUnits",
                 coalesce(sum(affordable_units), 0)::int AS "affordableUnits"
          FROM sf.development_pipeline
          WHERE ${developmentWhere({ status })} ${affordableOnly ? sql`AND affordable_units > 0` : sql``}
          GROUP BY 1 ORDER BY 1`
      )
    })

    const affordableWhere = (f: AffordableFilters) =>
      where([
        ...(f.status === undefined ? [] : [sql`a.status = ${f.status}`]),
        ...(f.neighborhood === undefined ? [] : [sql`a.neighborhood = ${f.neighborhood}`]),
        ...(f.supervisorDistrict === undefined ? [] : [sql`a.supervisor_district = ${f.supervisorDistrict}`]),
        ...(f.minUnits === undefined ? [] : [sql`a.total_units >= ${f.minUnits}`]),
        ...(f.estimatedStartBefore === undefined ? [] : [sql`a.estimated_start < ${f.estimatedStartBefore}::date`])
      ])

    const affordableProjects = Effect.fn("HousingRepo.affordableProjects")(function* (
      filters: AffordableFilters,
      limit: number
    ) {
      const condition = affordableWhere(filters)
      const [count] = yield* rows(Count)(
        yield* sql`SELECT count(*)::int AS total FROM sf.affordable_pipeline AS a WHERE ${condition}`
      )
      const projects = yield* rows(AffordableProjectRow)(
        yield* sql`
          SELECT a.project_id AS "projectId", a.name, a.status, a.construction_status AS "constructionStatus",
                 a.neighborhood, a.supervisor_district AS "supervisorDistrict", a.total_units AS "totalUnits",
                 a.affordable_units AS "affordableUnits",
                 a.estimated_start::text AS "estimatedConstructionStart",
                 a.estimated_completion::text AS "estimatedCompletion",
                 coalesce(
                   (SELECT json_agg(json_build_object('amiBand', u.ami_band, 'units', u.units) ORDER BY u.ami_band)
                    FROM sf.affordable_pipeline_ami_units AS u WHERE u.project_id = a.project_id),
                   '[]'::json
                 ) AS "unitsByAmi"
          FROM sf.affordable_pipeline AS a
          WHERE ${condition}
          ORDER BY a.project_id
          LIMIT ${limit}`
      )
      return { total: count?.total ?? 0, projects }
    })

    const affordableSummary = Effect.fn("HousingRepo.affordableSummary")(function* (
      groupBy: AffordableGroupBy,
      status: string | undefined
    ) {
      const condition = affordableWhere({ status })
      if (groupBy === "ami_band") {
        return yield* rows(AffordableGroupRow)(
          yield* sql`
            SELECT u.ami_band AS key, count(DISTINCT u.project_id)::int AS projects, sum(u.units)::int AS units
            FROM sf.affordable_pipeline_ami_units AS u
            JOIN sf.affordable_pipeline AS a ON a.project_id = u.project_id
            WHERE ${condition}
            GROUP BY 1 ORDER BY 1`
        )
      }
      const key = {
        status: sql`a.status`,
        construction_status: sql`a.construction_status`,
        neighborhood: sql`a.neighborhood`,
        district: sql`a.supervisor_district::text`
      }[groupBy]
      return yield* rows(AffordableGroupRow)(
        yield* sql`
          SELECT ${key} AS key, count(*)::int AS projects, coalesce(sum(a.affordable_units), 0)::int AS units
          FROM sf.affordable_pipeline AS a
          WHERE ${condition}
          GROUP BY 1 ORDER BY 1`
      )
    })

    const zone = Effect.fn("HousingRepo.zone")(function* (key: string) {
      const [row] = yield* rows(ZoneRow)(
        yield* sql`
          SELECT zone AS key, name, publisher, source_edited_at::text AS "sourceEditedAt",
                 publisher_description AS "publisherDescription"
          FROM sf.zones WHERE zone = ${key}`
      )
      return row ?? null
    })

    const exposure = Effect.fn("HousingRepo.exposure")(function* (
      zoneKey: string,
      source: ProjectSource,
      affordableOnly: boolean,
      limit: number
    ) {
      const projects =
        source === "development_pipeline"
          ? sql`
              SELECT project_key AS id, name_or_address AS name, status, coalesce(affordable_units, 0) AS affordable,
                     coalesce(net_units, 0) AS units, geom
              FROM sf.development_pipeline WHERE snapshot = ${latestSnapshot}`
          : sql`
              SELECT project_id AS id, name, status, affordable_units AS affordable, total_units AS units, geom
              FROM sf.affordable_pipeline`
      const candidates = sql`SELECT * FROM (${projects}) AS p ${affordableOnly ? sql`WHERE p.affordable > 0` : sql``}`
      const inside = sql`
        SELECT c.* FROM (${candidates}) AS c
        JOIN sf.project_zone_exposure AS e
          ON e.project_source = ${source} AND e.project_id = c.id AND e.zone = ${zoneKey}`
      const [totals] = yield* rows(ExposureTotalsRow)(
        yield* sql`
          SELECT (SELECT count(*)::int FROM (${candidates}) AS c) AS "projectsChecked",
                 (SELECT count(*)::int FROM (${candidates}) AS c WHERE c.geom IS NULL) AS "projectsWithoutLocation",
                 (SELECT count(*)::int FROM (${inside}) AS i) AS "totalInside",
                 (SELECT coalesce(sum(i.units), 0)::int FROM (${inside}) AS i) AS "unitsInside",
                 (SELECT coalesce(sum(i.affordable), 0)::int FROM (${inside}) AS i) AS "affordableUnitsInside"`
      )
      const list = yield* rows(ExposedProjectRow)(
        yield* sql`
          SELECT i.id, i.name, i.status, i.affordable::int AS "affordableUnits"
          FROM (${inside}) AS i ORDER BY i.affordable DESC, i.id LIMIT ${limit}`
      )
      return { totals, projects: list }
    })

    return {
      datasets,
      snapshot,
      developmentStatuses,
      affordableStatuses,
      neighborhoods,
      districts,
      developmentProjects,
      developmentSummary,
      affordableProjects,
      affordableSummary,
      zone,
      exposure
    } as const
  })
}) {
  static readonly layer = Layer.effect(this, this.make)
}
