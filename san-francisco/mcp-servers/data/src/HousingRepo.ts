import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"
import type { Fragment } from "effect/sql/Statement"

import { IsoDate, NonNegativeInt, PositiveInt } from "./Formats.ts"

const NullableText = Schema.NullOr(Schema.String)
const NullableDate = Schema.NullOr(IsoDate)
const NullableCount = Schema.NullOr(NonNegativeInt)

export const DatasetRow = Schema.Struct({
  datasetKey: Schema.String,
  title: Schema.String,
  publisher: NullableText,
  sourceUrl: Schema.String,
  license: NullableText,
  sourceVersion: IsoDate,
  publisherDescription: NullableText
})
export type DatasetRow = typeof DatasetRow.Type

export const DevelopmentProjectRow = Schema.Struct({
  projectKey: Schema.String,
  blockLot: Schema.String,
  nameOrAddress: Schema.String,
  status: Schema.String,
  statusSince: NullableDate,
  daysInStatus: NullableCount,
  planningApprovedOn: NullableDate,
  netUnits: Schema.NullOr(Schema.Int),
  affordableUnits: NullableCount,
  unitsExtremelyLow: NullableCount,
  unitsVeryLow: NullableCount,
  unitsLow: NullableCount,
  unitsModerate: NullableCount,
  neighborhood: NullableText,
  supervisorDistrict: Schema.NullOr(PositiveInt)
})
export type DevelopmentProjectRow = typeof DevelopmentProjectRow.Type

export const AffordableProjectRow = Schema.Struct({
  projectId: Schema.String,
  name: Schema.String,
  status: Schema.String,
  constructionStatus: Schema.String,
  neighborhood: Schema.String,
  supervisorDistrict: PositiveInt,
  totalUnits: NonNegativeInt,
  affordableUnits: NonNegativeInt,
  estimatedConstructionStart: NullableDate,
  estimatedCompletion: NullableDate,
  unitsByAmi: Schema.Array(Schema.Struct({ amiBand: Schema.String, units: NonNegativeInt }))
})
export type AffordableProjectRow = typeof AffordableProjectRow.Type

const GroupRow = Schema.Struct({
  key: Schema.String,
  projects: NonNegativeInt,
  netUnits: Schema.Int,
  affordableUnits: NonNegativeInt
})

const AffordableGroupRow = Schema.Struct({
  key: Schema.String,
  projects: NonNegativeInt,
  affordableUnits: NonNegativeInt
})

const IncomeBandRow = Schema.Struct({ amiBand: Schema.String, projects: NonNegativeInt, unitsInBand: NonNegativeInt })

export const ZoneRow = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  publisher: NullableText,
  sourceEditedAt: IsoDate,
  publisherDescription: NullableText
})
export type ZoneRow = typeof ZoneRow.Type

const ExposureTotalsRow = Schema.Struct({
  projectsChecked: NonNegativeInt,
  projectsWithoutLocation: NonNegativeInt,
  totalInside: NonNegativeInt,
  unitsInside: Schema.Int,
  affordableUnitsInside: NonNegativeInt
})

const ExposedProjectRow = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.String,
  affordableUnits: NonNegativeInt
})

const EvictionGroupRow = Schema.Struct({
  key: Schema.Record(Schema.String, Schema.String),
  notices: NonNegativeInt
})

const EvictionGroundRow = Schema.Struct({ key: Schema.String, label: Schema.String, section: NullableText })

const PeriodRow = Schema.Struct({ coveredFrom: NullableText, coveredTo: NullableText })

const Count = Schema.Struct({ count: NonNegativeInt })

const Value = Schema.Struct({ value: Schema.String })
const NullableValue = Schema.Struct({ value: NullableText })

/** A row of a list query that also carries the number of rows matching before the limit, from `count(*) OVER ()`. */
const Counted = <F extends Schema.Struct.Fields>(row: Schema.Struct<F>) =>
  Schema.Struct({ ...row.fields, total: NonNegativeInt })

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

export interface EvictionFilters {
  readonly from: string
  readonly to: string
  readonly grounds?: ReadonlyArray<string> | undefined
  readonly neighborhood?: string | undefined
  readonly supervisorDistrict?: number | undefined
}

export type EvictionGroupBy = "ground" | "neighborhood" | "district" | "year" | "month"

export type DevelopmentGroupBy = "status" | "neighborhood" | "district" | "approval_year"
export type AffordableGroupBy = "status" | "construction_status" | "neighborhood" | "district"
export type ProjectSource = "development_pipeline" | "affordable_pipeline"

/** The projects an exposure query reads: one development pipeline snapshot, or the MOHCD pipeline. */
export type ExposureProjects =
  { readonly source: "development_pipeline"; readonly snapshot: string } | { readonly source: "affordable_pipeline" }

/** The rows of a list query and how many rows matched before its limit. */
const withTotal = <A extends { readonly total: number }>(found: ReadonlyArray<A>) => ({
  total: found[0]?.total ?? 0,
  rows: found.map(({ total: _total, ...row }) => row)
})

/**
 * Read-only queries over the `sf_data` schema that the San Francisco ingestion project builds. Queries over the
 * development pipeline take the snapshot to read, which the caller resolves once with `snapshot`, so every query
 * behind one answer reads the same quarter even if a new one is loaded meanwhile.
 */
export class HousingRepo extends Context.Service<HousingRepo>()("HousingRepo", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const rows = <S extends Schema.Top>(schema: S) => Schema.decodeUnknownEffect(Schema.Array(schema))
    /** Decodes a query that always returns exactly one row, such as an aggregate. */
    const oneRow = <S extends Schema.Top>(schema: S) => Schema.decodeUnknownEffect(Schema.Tuple([schema]))
    const where = (clauses: ReadonlyArray<Fragment>) => (clauses.length === 0 ? sql`TRUE` : sql.and(clauses))

    const datasets = Effect.fn("HousingRepo.datasets")(function* () {
      return yield* rows(DatasetRow)(
        yield* sql`
          SELECT dataset_key AS "datasetKey", title, publisher, source_url AS "sourceUrl", license,
                 source_version::text AS "sourceVersion", publisher_description AS "publisherDescription"
          FROM sf_data.datasets ORDER BY dataset_key`
      )
    })

    const values = Effect.fn("HousingRepo.values")(function* (query: Fragment) {
      const found = yield* rows(Value)(yield* sql`SELECT DISTINCT value FROM (${query}) AS v WHERE value IS NOT NULL`)
      return found.map((r) => r.value).sort()
    })

    const developmentStatuses = (snapshot: string) =>
      values(sql`SELECT status AS value FROM sf_data.development_pipeline WHERE snapshot = ${snapshot}`)
    const affordableStatuses = () => values(sql`SELECT status AS value FROM sf_data.affordable_pipeline`)
    const neighborhoods = () => values(sql`SELECT name AS value FROM sf_data.neighborhoods`)
    const districts = () =>
      values(sql`
        SELECT supervisor_district::text AS value FROM sf_data.development_pipeline
        UNION SELECT supervisor_district::text FROM sf_data.affordable_pipeline`)

    /** The latest loaded development pipeline snapshot, or null when none is loaded. */
    const snapshot = Effect.fn("HousingRepo.snapshot")(function* () {
      const [row] = yield* oneRow(NullableValue)(
        yield* sql`SELECT max(snapshot) AS value FROM sf_data.development_pipeline`
      )
      return row.value
    })

    const developmentWhere = (snapshot: string, f: DevelopmentFilters) =>
      where([
        sql`snapshot = ${snapshot}`,
        ...(f.status === undefined ? [] : [sql`status = ${f.status}`]),
        ...(f.neighborhood === undefined ? [] : [sql`neighborhood = ${f.neighborhood}`]),
        ...(f.supervisorDistrict === undefined ? [] : [sql`supervisor_district = ${f.supervisorDistrict}`]),
        ...(f.minAffordableUnits === undefined ? [] : [sql`affordable_units >= ${f.minAffordableUnits}`]),
        ...(f.inStatusSinceBefore === undefined ? [] : [sql`status_since < ${f.inStatusSinceBefore}::date`]),
        ...(f.approvedBefore === undefined ? [] : [sql`planning_approved_on < ${f.approvedBefore}::date`])
      ])

    const developmentProjects = Effect.fn("HousingRepo.developmentProjects")(function* (
      snapshot: string,
      filters: DevelopmentFilters,
      limit: number
    ) {
      const found = yield* rows(Counted(DevelopmentProjectRow))(
        yield* sql`
          SELECT project_key AS "projectKey", block_lot AS "blockLot", name_or_address AS "nameOrAddress", status,
                 status_since::text AS "statusSince", (source_version - status_since) AS "daysInStatus",
                 planning_approved_on::text AS "planningApprovedOn", net_units AS "netUnits",
                 affordable_units AS "affordableUnits", units_extremely_low AS "unitsExtremelyLow",
                 units_very_low AS "unitsVeryLow", units_low AS "unitsLow", units_moderate AS "unitsModerate",
                 neighborhood, supervisor_district AS "supervisorDistrict", count(*) OVER ()::int AS total
          FROM sf_data.development_pipeline
          WHERE ${developmentWhere(snapshot, filters)}
          ORDER BY status_since NULLS LAST, project_key
          LIMIT ${limit}`
      )
      const { total, rows: projects } = withTotal(found)
      return { total, projects }
    })

    const developmentSummary = Effect.fn("HousingRepo.developmentSummary")(function* (
      snapshot: string,
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
          FROM sf_data.development_pipeline
          WHERE ${developmentWhere(snapshot, { status })} ${affordableOnly ? sql`AND affordable_units > 0` : sql``}
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
      const found = yield* rows(Counted(AffordableProjectRow))(
        yield* sql`
          SELECT a.project_id AS "projectId", a.name, a.status, a.construction_status AS "constructionStatus",
                 a.neighborhood, a.supervisor_district AS "supervisorDistrict", a.total_units AS "totalUnits",
                 a.affordable_units AS "affordableUnits",
                 a.estimated_start::text AS "estimatedConstructionStart",
                 a.estimated_completion::text AS "estimatedCompletion",
                 coalesce(
                   (SELECT json_agg(json_build_object('amiBand', u.ami_band, 'units', u.units) ORDER BY u.ami_band)
                    FROM sf_data.affordable_pipeline_ami_units AS u WHERE u.project_id = a.project_id),
                   '[]'::json
                 ) AS "unitsByAmi",
                 count(*) OVER ()::int AS total
          FROM sf_data.affordable_pipeline AS a
          WHERE ${affordableWhere(filters)}
          ORDER BY a.project_id
          LIMIT ${limit}`
      )
      const { total, rows: projects } = withTotal(found)
      return { total, projects }
    })

    const affordableSummary = Effect.fn("HousingRepo.affordableSummary")(function* (
      groupBy: AffordableGroupBy,
      status: string | undefined
    ) {
      const key = {
        status: sql`a.status`,
        construction_status: sql`a.construction_status`,
        neighborhood: sql`a.neighborhood`,
        district: sql`a.supervisor_district::text`
      }[groupBy]
      return yield* rows(AffordableGroupRow)(
        yield* sql`
          SELECT ${key} AS key, count(*)::int AS projects,
                 coalesce(sum(a.affordable_units), 0)::int AS "affordableUnits"
          FROM sf_data.affordable_pipeline AS a
          WHERE ${affordableWhere({ status })}
          GROUP BY 1 ORDER BY 1`
      )
    })

    const affordableUnitsByIncomeBand = Effect.fn("HousingRepo.affordableUnitsByIncomeBand")(function* (
      status: string | undefined
    ) {
      return yield* rows(IncomeBandRow)(
        yield* sql`
          SELECT u.ami_band AS "amiBand", count(DISTINCT u.project_id)::int AS projects,
                 sum(u.units)::int AS "unitsInBand"
          FROM sf_data.affordable_pipeline_ami_units AS u
          JOIN sf_data.affordable_pipeline AS a ON a.project_id = u.project_id
          WHERE ${affordableWhere({ status })}
          GROUP BY 1 ORDER BY 1`
      )
    })

    const zone = Effect.fn("HousingRepo.zone")(function* (key: string) {
      const [row] = yield* rows(ZoneRow)(
        yield* sql`
          SELECT zone AS key, name, publisher, source_edited_at::text AS "sourceEditedAt",
                 publisher_description AS "publisherDescription"
          FROM sf_data.zones WHERE zone = ${key}`
      )
      return row ?? null
    })

    /** The projects from one pipeline inside one zone; dbt builds zone membership for the latest snapshot. */
    const exposure = Effect.fn("HousingRepo.exposure")(function* (
      zoneKey: string,
      from: ExposureProjects,
      affordableOnly: boolean,
      limit: number
    ) {
      const source: ProjectSource = from.source
      const projects =
        from.source === "development_pipeline"
          ? sql`
              SELECT project_key AS id, name_or_address AS name, status, coalesce(affordable_units, 0) AS affordable,
                     coalesce(net_units, 0) AS units, geom
              FROM sf_data.development_pipeline WHERE snapshot = ${from.snapshot}`
          : sql`
              SELECT project_id AS id, name, status, affordable_units AS affordable, total_units AS units, geom
              FROM sf_data.affordable_pipeline`
      const scope = sql`
        WITH candidates AS (
          SELECT * FROM (${projects}) AS p ${affordableOnly ? sql`WHERE p.affordable > 0` : sql``}
        ),
        inside AS (
          SELECT c.* FROM candidates AS c
          JOIN sf_data.project_zone_exposure AS e
            ON e.project_source = ${source} AND e.project_id = c.id AND e.zone = ${zoneKey}
        )`
      const [totals] = yield* oneRow(ExposureTotalsRow)(
        yield* sql`
          ${scope}
          SELECT (SELECT count(*)::int FROM candidates) AS "projectsChecked",
                 (SELECT count(*)::int FROM candidates WHERE geom IS NULL) AS "projectsWithoutLocation",
                 (SELECT count(*)::int FROM inside) AS "totalInside",
                 (SELECT coalesce(sum(units), 0)::int FROM inside) AS "unitsInside",
                 (SELECT coalesce(sum(affordable), 0)::int FROM inside) AS "affordableUnitsInside"`
      )
      const list = yield* rows(ExposedProjectRow)(
        yield* sql`
          ${scope}
          SELECT id, name, status, affordable::int AS "affordableUnits"
          FROM inside ORDER BY affordable DESC, id LIMIT ${limit}`
      )
      return { totals, projects: list }
    })

    /** The first and last months with a filed notice, as YYYY-MM, or nulls when no notices are loaded. */
    const evictionPeriod = Effect.fn("HousingRepo.evictionPeriod")(function* () {
      const [row] = yield* oneRow(PeriodRow)(
        yield* sql`
          SELECT to_char(min(file_month), 'YYYY-MM') AS "coveredFrom", to_char(max(file_month), 'YYYY-MM') AS "coveredTo"
          FROM sf_data.eviction_notices`
      )
      return row
    })

    const evictionGroundKeys = () => values(sql`SELECT ground_key AS value FROM sf_data.eviction_grounds`)
    const evictionDistricts = () => values(sql`SELECT supervisor_district::text AS value FROM sf_data.eviction_notices`)

    const evictionGrounds = Effect.fn("HousingRepo.evictionGrounds")(function* () {
      return yield* rows(EvictionGroundRow)(
        yield* sql`SELECT ground_key AS key, label, section FROM sf_data.eviction_grounds ORDER BY ground_key`
      )
    })

    const evictionWhere = (f: EvictionFilters) =>
      where([
        sql`n.file_month BETWEEN to_date(${f.from}, 'YYYY-MM') AND to_date(${f.to}, 'YYYY-MM')`,
        ...(f.neighborhood === undefined ? [] : [sql`n.neighborhood = ${f.neighborhood}`]),
        ...(f.supervisorDistrict === undefined ? [] : [sql`n.supervisor_district = ${f.supervisorDistrict}`]),
        ...(f.grounds === undefined
          ? []
          : [
              sql`EXISTS (SELECT 1 FROM sf_data.eviction_notice_grounds AS any_ground
                          WHERE any_ground.eviction_id = n.eviction_id AND any_ground.ground_key IN ${sql.in(f.grounds)})`
            ])
      ])

    /**
     * The number of notices matching `filters`, and their counts grouped by `groupBy`. Grouping by ground counts a
     * notice once for each ground it gives, among the filtered grounds when `grounds` is given.
     */
    const evictionCounts = Effect.fn("HousingRepo.evictionCounts")(function* (
      filters: EvictionFilters,
      groupBy: ReadonlyArray<EvictionGroupBy>
    ) {
      const [total] = yield* oneRow(Count)(
        yield* sql`SELECT count(*)::int AS count FROM sf_data.eviction_notices AS n WHERE ${evictionWhere(filters)}`
      )
      if (groupBy.length === 0) return { total: total.count, groups: [] }
      const byGround = groupBy.includes("ground")
      const keyOf = {
        ground: sql`g.ground_key`,
        neighborhood: sql`coalesce(n.neighborhood, 'unknown')`,
        district: sql`coalesce(n.supervisor_district::text, 'unknown')`,
        year: sql`to_char(n.file_month, 'YYYY')`,
        month: sql`to_char(n.file_month, 'YYYY-MM')`
      }
      const keys = groupBy.map((field) => sql`${field}::text, ${keyOf[field]}`)
      const groupKeys = groupBy.map((field) => keyOf[field])
      const groups = yield* rows(EvictionGroupRow)(
        yield* sql`
          SELECT json_build_object(${sql.csv(keys)}) AS key, count(DISTINCT n.eviction_id)::int AS notices
          FROM sf_data.eviction_notices AS n
          ${byGround ? sql`JOIN sf_data.eviction_notice_grounds AS g ON g.eviction_id = n.eviction_id` : sql``}
          WHERE ${evictionWhere(filters)}
            ${byGround && filters.grounds !== undefined ? sql`AND g.ground_key IN ${sql.in(filters.grounds)}` : sql``}
          GROUP BY ${sql.csv(groupKeys)}
          ORDER BY ${sql.csv(groupKeys)}`
      )
      return { total: total.count, groups }
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
      affordableUnitsByIncomeBand,
      zone,
      exposure,
      evictionPeriod,
      evictionGroundKeys,
      evictionDistricts,
      evictionGrounds,
      evictionCounts
    } as const
  })
}) {
  static readonly layer = Layer.effect(this, this.make)
}
