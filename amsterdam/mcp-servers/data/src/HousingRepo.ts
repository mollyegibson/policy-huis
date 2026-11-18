import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient } from "effect/sql"
import type { Fragment } from "effect/sql/Statement"

import { IsoDate, NonNegativeInt } from "./Formats.ts"

const NullableText = Schema.NullOr(Schema.String)
const NullableDate = Schema.NullOr(IsoDate)
const NullableCount = Schema.NullOr(NonNegativeInt)
const NullableMoney = Schema.NullOr(Schema.Finite)

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

export const PlannedProjectRow = Schema.Struct({
  projectId: Schema.String,
  name: Schema.String,
  stadsdeel: NullableText,
  gebied: NullableText,
  wijk: NullableText,
  publicationStage: NullableText,
  constructionStartPlanned: NullableDate,
  constructionStartRealised: NullableDate,
  totalUnits: NonNegativeInt,
  unitsSocialRent: NullableCount,
  unitsMidRent: NullableCount,
  unitsPrivateRent: NullableCount,
  unitsOwnerOccupied: NullableCount,
  unitsOther: NullableCount
})
export type PlannedProjectRow = typeof PlannedProjectRow.Type

const PlannedGroupRow = Schema.Struct({
  key: Schema.String,
  projects: NonNegativeInt,
  totalUnits: NonNegativeInt,
  unitsSocialRent: NonNegativeInt,
  unitsMidRent: NonNegativeInt,
  unitsPrivateRent: NonNegativeInt,
  unitsOwnerOccupied: NonNegativeInt,
  unitsOther: NonNegativeInt
})

const LabelGroupRow = Schema.Struct({ key: Schema.String, labels: NonNegativeInt })

export const AddressLabelRow = Schema.Struct({
  labelClass: Schema.String,
  label: Schema.String,
  buildYear: Schema.NullOr(Schema.Int),
  buildYearBand: NullableText,
  registeredOn: IsoDate,
  validUntil: NullableDate,
  surface: NullableMoney
})

export const RentalListingRow = Schema.Struct({
  listingId: Schema.String,
  name: NullableText,
  roomType: Schema.String,
  neighbourhood: NullableText,
  nightlyPrice: NullableMoney,
  minimumNights: NullableCount,
  nightsAvailable: NullableCount,
  estimatedOccupancyNights: NullableCount,
  estimatedRevenue: NullableMoney,
  registration: NullableText,
  registered: Schema.Boolean,
  hostListingsCount: NullableCount
})

const RentalGroupRow = Schema.Struct({
  key: Schema.String,
  listings: NonNegativeInt,
  nightsAvailable: NonNegativeInt,
  withRegistration: NonNegativeInt
})

const Value = Schema.Struct({ value: Schema.String })
const NullableValue = Schema.Struct({ value: NullableText })

/** A row of a list query that also carries the number of rows matching before the limit, from `count(*) OVER ()`. */
const Counted = <F extends Schema.Struct.Fields>(row: Schema.Struct<F>) =>
  Schema.Struct({ ...row.fields, total: NonNegativeInt })

export interface PlannedFilters {
  readonly district?: string | undefined
  readonly neighborhood?: string | undefined
  readonly minUnits?: number | undefined
  readonly buildingFrom?: string | undefined
}

export interface RentalFilters {
  readonly neighbourhood?: string | undefined
  readonly roomType?: string | undefined
  readonly registeredOnly?: boolean | undefined
  readonly minNightlyPrice?: number | undefined
}

export type PlannedGroupBy = "district" | "neighborhood" | "planned_start_year"
export type LabelGroupBy = "label_class" | "build_year_band"
export type RentalGroupBy = "room_type" | "neighbourhood"

/** The rows of a list query and how many rows matched before its limit. */
const withTotal = <A extends { readonly total: number }>(found: ReadonlyArray<A>) => ({
  total: found[0]?.total ?? 0,
  rows: found.map(({ total: _total, ...row }) => row)
})

/**
 * Read-only queries over the `ams_data` schema that the Amsterdam ingestion project builds. Queries over the planned
 * housing take the peildatum to read, which the caller resolves once with `plannedSnapshot`, so every query behind one
 * answer reads the same snapshot even if a new one is loaded meanwhile.
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
          FROM ams_data.datasets ORDER BY dataset_key`
      )
    })

    const values = Effect.fn("HousingRepo.values")(function* (query: Fragment) {
      const found = yield* rows(Value)(yield* sql`SELECT DISTINCT value FROM (${query}) AS v WHERE value IS NOT NULL`)
      return found.map((r) => r.value).sort()
    })

    const districts = () => values(sql`SELECT name AS value FROM ams_data.districts`)
    const neighborhoods = () => values(sql`SELECT name AS value FROM ams_data.neighborhoods`)

    /** The peildatum of the latest loaded planned-housing snapshot, or null when none is loaded. */
    const plannedSnapshot = Effect.fn("HousingRepo.plannedSnapshot")(function* () {
      const [row] = yield* oneRow(NullableValue)(
        yield* sql`SELECT max(peildatum)::text AS value FROM ams_data.planned_housing`
      )
      return row.value
    })

    const plannedWhere = (p: PlannedFilters) =>
      where([
        ...(p.district === undefined ? [] : [sql`stadsdeel = ${p.district}`]),
        ...(p.neighborhood === undefined ? [] : [sql`wijk = ${p.neighborhood}`]),
        ...(p.minUnits === undefined ? [] : [sql`total_units >= ${p.minUnits}`]),
        ...(p.buildingFrom === undefined ? [] : [sql`construction_start_planned >= ${p.buildingFrom}-01-01`])
      ])

    const plannedProjects = Effect.fn("HousingRepo.plannedProjects")(function* (
      filters: PlannedFilters,
      limit: number
    ) {
      const found = yield* rows(Counted(PlannedProjectRow))(
        yield* sql`
          SELECT project_id AS "projectId", name, stadsdeel, gebied, wijk,
                 publication_stage AS "publicationStage",
                 construction_start_planned::text AS "constructionStartPlanned",
                 construction_start_realised::text AS "constructionStartRealised",
                 coalesce(total_units, 0) AS "totalUnits",
                 coalesce(units_social_rent_corporation, 0) + coalesce(units_social_rent_independent, 0)
                   AS "unitsSocialRent",
                 coalesce(units_mid_rent, 0) AS "unitsMidRent",
                 coalesce(units_private_rent, 0) AS "unitsPrivateRent",
                 coalesce(units_private_sale, 0) + coalesce(units_affordable_sale, 0) AS "unitsOwnerOccupied",
                 coalesce(units_private_rent_or_sale, 0) + coalesce(units_non_self_contained, 0)
                   + coalesce(units_temporary, 0) + coalesce(units_student, 0) + coalesce(units_young, 0)
                   + coalesce(units_self_build, 0) + coalesce(units_unknown_tenure, 0) AS "unitsOther",
                 count(*) OVER ()::int AS total
          FROM ams_data.planned_housing
          WHERE ${plannedWhere(filters)}
          ORDER BY total_units DESC NULLS LAST, project_id
          LIMIT ${limit}`
      )
      const { total, rows: projects } = withTotal(found)
      return { total, projects }
    })

    const plannedSummary = Effect.fn("HousingRepo.plannedSummary")(function* (
      groupBy: PlannedGroupBy,
      filters: PlannedFilters
    ) {
      const key = {
        district: sql`coalesce(stadsdeel, 'unknown')`,
        neighborhood: sql`coalesce(wijk, 'unknown')`,
        planned_start_year: sql`coalesce(extract(year FROM construction_start_planned)::int::text, 'not planned')`
      }[groupBy]
      return yield* rows(PlannedGroupRow)(
        yield* sql`
          SELECT ${key} AS key, count(*)::int AS projects,
                 coalesce(sum(total_units), 0)::int AS "totalUnits",
                 coalesce(sum(units_social_rent_corporation + units_social_rent_independent), 0)::int
                   AS "unitsSocialRent",
                 coalesce(sum(units_mid_rent), 0)::int AS "unitsMidRent",
                 coalesce(sum(units_private_rent), 0)::int AS "unitsPrivateRent",
                 coalesce(sum(units_private_sale + units_affordable_sale), 0)::int AS "unitsOwnerOccupied",
                 coalesce(sum(units_private_rent_or_sale + units_non_self_contained + units_temporary + units_student
                   + units_young + units_self_build + units_unknown_tenure), 0)::int AS "unitsOther"
          FROM ams_data.planned_housing
          WHERE ${plannedWhere(filters)}
          GROUP BY 1 ORDER BY 1`
      )
    })

    const labelClasses = () => values(sql`SELECT label_class AS value FROM ams_data.energy_labels`)
    const buildYearBands = () => values(sql`SELECT build_year_band AS value FROM ams_data.energy_labels`)

    const energyLabelsSummary = Effect.fn("HousingRepo.energyLabelsSummary")(function* (
      groupBy: LabelGroupBy,
      labelClass: string | undefined,
      buildYearBand: string | undefined
    ) {
      const key = { label_class: sql`label_class`, build_year_band: sql`coalesce(build_year_band, 'unknown')` }[groupBy]
      return yield* rows(LabelGroupRow)(
        yield* sql`
          SELECT ${key} AS key, count(*)::int AS labels
          FROM ams_data.energy_labels
          WHERE ${where([
            ...(labelClass === undefined ? [] : [sql`label_class = ${labelClass}`]),
            ...(buildYearBand === undefined ? [] : [sql`build_year_band = ${buildYearBand}`])
          ])}
          GROUP BY 1 ORDER BY 1`
      )
    })

    const energyLabelAtAddress = Effect.fn("HousingRepo.energyLabelAtAddress")(function* (
      postcode: string,
      houseNumber: number
    ) {
      return yield* rows(AddressLabelRow)(
        yield* sql`
          SELECT label_class AS "labelClass", label, build_year AS "buildYear", build_year_band AS "buildYearBand",
                 registered_on::text AS "registeredOn", valid_until::text AS "validUntil", surface
          FROM ams_data.energy_labels
          WHERE upper(postcode) = ${postcode.toUpperCase()} AND house_number = ${houseNumber}
          ORDER BY registered_on DESC, label_class`
      )
    })

    const rentalRoomTypes = () => values(sql`SELECT room_type AS value FROM ams_data.short_term_rentals`)
    const rentalNeighbourhoods = () => values(sql`SELECT neighbourhood AS value FROM ams_data.short_term_rentals`)

    const rentalWhere = (f: RentalFilters) =>
      where([
        ...(f.neighbourhood === undefined ? [] : [sql`neighbourhood = ${f.neighbourhood}`]),
        ...(f.roomType === undefined ? [] : [sql`room_type = ${f.roomType}`]),
        ...(f.registeredOnly === true ? [sql`registered`] : []),
        ...(f.minNightlyPrice === undefined ? [] : [sql`nightly_price >= ${f.minNightlyPrice}`])
      ])

    const rentalListings = Effect.fn("HousingRepo.rentalListings")(function* (filters: RentalFilters, limit: number) {
      const found = yield* rows(Counted(RentalListingRow))(
        yield* sql`
          SELECT listing_id AS "listingId", name, room_type AS "roomType", neighbourhood,
                 nightly_price AS "nightlyPrice", minimum_nights AS "minimumNights",
                 nights_available AS "nightsAvailable", estimated_occupancy_nights AS "estimatedOccupancyNights",
                 estimated_revenue AS "estimatedRevenue", registration, registered,
                 host_listings_count AS "hostListingsCount", count(*) OVER ()::int AS total
          FROM ams_data.short_term_rentals
          WHERE ${rentalWhere(filters)}
          ORDER BY nightly_price DESC NULLS LAST, listing_id
          LIMIT ${limit}`
      )
      const { total, rows: listings } = withTotal(found)
      return { total, listings }
    })

    const rentalSummary = Effect.fn("HousingRepo.rentalSummary")(function* (
      groupBy: RentalGroupBy,
      filters: RentalFilters
    ) {
      const key = {
        room_type: sql`room_type`,
        neighbourhood: sql`coalesce(neighbourhood, 'unknown')`
      }[groupBy]
      return yield* rows(RentalGroupRow)(
        yield* sql`
          SELECT ${key} AS key, count(*)::int AS listings,
                 coalesce(sum(nights_available), 0)::int AS "nightsAvailable",
                 count(*) FILTER (WHERE registered)::int AS "withRegistration"
          FROM ams_data.short_term_rentals
          WHERE ${rentalWhere(filters)}
          GROUP BY 1 ORDER BY 1`
      )
    })

    return {
      datasets,
      districts,
      neighborhoods,
      plannedSnapshot,
      plannedProjects,
      plannedSummary,
      labelClasses,
      buildYearBands,
      energyLabelsSummary,
      energyLabelAtAddress,
      rentalRoomTypes,
      rentalNeighbourhoods,
      rentalListings,
      rentalSummary
    } as const
  })
}) {
  static readonly layer = Layer.effect(this, this.make)
}
