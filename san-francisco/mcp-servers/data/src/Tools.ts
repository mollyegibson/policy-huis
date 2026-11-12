import { Schema } from "effect"
import { Tool, Toolkit } from "effect/ai"

import { Citation } from "./Citations.ts"
import { IsoDate, NonNegativeInt, PositiveInt, YearMonth } from "./Formats.ts"
import { OptionalParam } from "./Params.ts"
import { DataErrors, UnknownValue } from "./ToolErrors.ts"

const Citations = Schema.Array(Citation)

/** What a tool returns to the model instead of a result: an input the data does not contain, or data it cannot read. */
const ToolFailure = Schema.Union([UnknownValue, ...DataErrors])

const NeighborhoodName = Schema.String.annotate({
  description: "An analysis neighborhood name, such as appears in tool results"
})
const SupervisorDistrict = PositiveInt.annotate({ description: "A supervisor district number" })
const DevelopmentStatus = Schema.String.annotate({
  description: "A Planning pipeline status, as listed by development_pipeline_summary grouped by status"
})
const AffordableStatus = Schema.String.annotate({
  description: "A MOHCD project status, as listed by affordable_pipeline_summary grouped by status"
})
const Limit = Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 50 })))

const DevelopmentProject = Schema.Struct({
  projectKey: Schema.String,
  blockLot: Schema.String,
  nameOrAddress: Schema.String,
  status: Schema.String,
  statusSince: Schema.NullOr(IsoDate),
  daysInStatus: Schema.NullOr(NonNegativeInt),
  planningApprovedOn: Schema.NullOr(IsoDate),
  netUnits: Schema.NullOr(Schema.Int),
  affordableUnits: Schema.NullOr(NonNegativeInt),
  affordableUnitsByLevel: Schema.Struct({
    extremelyLow: Schema.NullOr(NonNegativeInt),
    veryLow: Schema.NullOr(NonNegativeInt),
    low: Schema.NullOr(NonNegativeInt),
    moderate: Schema.NullOr(NonNegativeInt)
  }),
  neighborhood: Schema.NullOr(Schema.String),
  supervisorDistrict: Schema.NullOr(PositiveInt)
})

const AmiUnits = Schema.Struct({
  amiBand: Schema.String,
  units: NonNegativeInt
})

const AffordableProject = Schema.Struct({
  projectId: Schema.String,
  name: Schema.String,
  status: Schema.String,
  constructionStatus: Schema.String,
  neighborhood: Schema.String,
  supervisorDistrict: PositiveInt,
  totalUnits: NonNegativeInt,
  affordableUnits: NonNegativeInt,
  unitsByAmi: Schema.Array(AmiUnits),
  estimatedConstructionStart: Schema.NullOr(IsoDate),
  estimatedCompletion: Schema.NullOr(IsoDate)
})

export const HazardZoneKey = Schema.Literals([
  "slr_66in_100yr_storm",
  "sfpuc_100yr_storm",
  "air_pollutant_exposure_zone"
])
export const ProjectSource = Schema.Literals(["development_pipeline", "affordable_pipeline"])

export const DevelopmentPipelineProjects = Tool.make("development_pipeline_projects", {
  description:
    "List projects in the Planning Department's development pipeline, with each project's status, the date it reached that status, and its affordable units. The data is one quarterly snapshot: say which. Report how long a project has held its status; do not call a project stalled.",
  parameters: Schema.Struct({
    status: OptionalParam(DevelopmentStatus),
    neighborhood: OptionalParam(NeighborhoodName),
    supervisorDistrict: OptionalParam(SupervisorDistrict),
    minAffordableUnits: OptionalParam(NonNegativeInt),
    inStatusSinceBefore: OptionalParam(IsoDate),
    approvedBefore: OptionalParam(IsoDate),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    projects: Schema.Array(DevelopmentProject),
    snapshot: Schema.String,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Planning pipeline projects")

export const DevelopmentPipelineSummary = Tool.make("development_pipeline_summary", {
  description:
    "Total the development pipeline's projects, net units and affordable units by status, neighborhood, district or year of Planning approval, from one quarterly snapshot: say which.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["status", "neighborhood", "district", "approval_year"]),
    status: OptionalParam(DevelopmentStatus),
    affordableOnly: OptionalParam(Schema.Boolean)
  }),
  success: Schema.Struct({
    groups: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        projects: NonNegativeInt,
        netUnits: Schema.Int,
        affordableUnits: NonNegativeInt
      })
    ),
    snapshot: Schema.String,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Planning pipeline totals")

export const AffordablePipelineProjects = Tool.make("affordable_pipeline_projects", {
  description:
    "List MOHCD-supported affordable housing projects, with units by income band and construction dates. Construction start and completion dates are MOHCD's estimates and some have passed: say so when you use them.",
  parameters: Schema.Struct({
    status: OptionalParam(AffordableStatus),
    neighborhood: OptionalParam(NeighborhoodName),
    supervisorDistrict: OptionalParam(SupervisorDistrict),
    minUnits: OptionalParam(PositiveInt),
    estimatedStartBefore: OptionalParam(IsoDate),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    projects: Schema.Array(AffordableProject),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "MOHCD affordable projects")

export const AffordablePipelineSummary = Tool.make("affordable_pipeline_summary", {
  description:
    "Total MOHCD's affordable pipeline projects and their affordable units by status, construction stage, neighborhood or district. For units by income band, use affordable_pipeline_units_by_income_band.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["status", "construction_status", "neighborhood", "district"]),
    status: OptionalParam(AffordableStatus)
  }),
  success: Schema.Struct({
    groups: Schema.Array(
      Schema.Struct({ key: Schema.String, projects: NonNegativeInt, affordableUnits: NonNegativeInt })
    ),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "MOHCD affordable pipeline totals")

export const AffordablePipelineUnitsByIncomeBand = Tool.make("affordable_pipeline_units_by_income_band", {
  description:
    "Total MOHCD's affordable pipeline units in each income band, as a share of area median income (AMI), with how many projects have units in that band. Bands are named as MOHCD's dataset names its columns: the number in a band's name is its percent of AMI. A project with units in several bands is counted in each, so the project counts do not add up to the number of projects.",
  parameters: Schema.Struct({ status: OptionalParam(AffordableStatus) }),
  success: Schema.Struct({
    bands: Schema.Array(
      Schema.Struct({ amiBand: Schema.String, projects: NonNegativeInt, unitsInBand: NonNegativeInt })
    ),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Affordable units by income band")

export const ProjectHazardExposure = Tool.make("project_hazard_exposure", {
  description:
    "List pipeline projects inside one flood or exposure zone. Each zone answers a different question (stormwater flooding, an extreme sea-level-rise scenario, or where new housing needs enhanced ventilation); never combine them into one risk. Name the zone, its publisher and date. Projects without a location are counted, not checked.",
  parameters: Schema.Struct({
    zone: HazardZoneKey,
    projects: ProjectSource,
    affordableOnly: OptionalParam(Schema.Boolean),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    zone: Schema.Struct({
      key: HazardZoneKey,
      name: Schema.String,
      publisher: Schema.NullOr(Schema.String),
      sourceEditedAt: IsoDate,
      publisherDescription: Schema.NullOr(Schema.String)
    }),
    projectsChecked: NonNegativeInt,
    projectsWithoutLocation: NonNegativeInt,
    totalInside: NonNegativeInt,
    unitsInside: Schema.Int,
    affordableUnitsInside: NonNegativeInt,
    projects: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        status: Schema.String,
        affordableUnits: NonNegativeInt
      })
    ),
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Projects in a flood or exposure zone")

export const DatasetInfo = Tool.make("dataset_info", {
  description:
    "Describe the loaded datasets: source, license, version, load date, and the publisher's own description, which states the data's limits in the publisher's words. Quote it when a user asks how current or reliable the data is.",
  parameters: Schema.Struct({ dataset: OptionalParam(Schema.String) }),
  success: Schema.Struct({
    datasets: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        title: Schema.String,
        publisher: Schema.NullOr(Schema.String),
        sourceUrl: Schema.String,
        license: Schema.NullOr(Schema.String),
        sourceVersion: Schema.String,
        publisherDescription: Schema.NullOr(Schema.String)
      })
    ),
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Dataset details")

/** A month range outside the months the Eviction Notices data covers. */
export class PeriodOutOfRange extends Schema.TaggedError<PeriodOutOfRange>()("PeriodOutOfRange", {
  requestedFrom: YearMonth,
  requestedTo: YearMonth,
  coveredFrom: YearMonth,
  coveredTo: YearMonth
}) {}

const GroundKey = Schema.String.annotate({ description: "A ground key, as listed by eviction_grounds" })
export const EvictionGroupBy = Schema.Literals(["ground", "neighborhood", "district", "year", "month"])

export const EvictionNoticeCounts = Tool.make("eviction_notice_counts", {
  description:
    "Count eviction notices filed with the San Francisco Rent Board in a range of months, optionally filtered to notices giving any of the listed grounds, a neighborhood or a supervisor district, and grouped by up to two of ground, neighborhood, district, year or month. A notice is a landlord's filing, not a completed eviction: say so. A notice can give several grounds, so counts by ground can add up to more than the total, and a notice that gives no ground is in the total but in no ground's count. Landlords need not file non-payment notices with the Rent Board, so those are undercounted.",
  parameters: Schema.Struct({
    from: YearMonth,
    to: YearMonth,
    grounds: OptionalParam(Schema.Array(GroundKey)),
    neighborhood: OptionalParam(NeighborhoodName),
    supervisorDistrict: OptionalParam(SupervisorDistrict),
    groupBy: OptionalParam(Schema.Array(EvictionGroupBy).pipe(Schema.check(Schema.isMaxLength(2))))
  }),
  success: Schema.Struct({
    from: YearMonth,
    to: YearMonth,
    dataAsOf: IsoDate,
    totalNotices: NonNegativeInt,
    groups: Schema.Array(Schema.Struct({ key: Schema.Record(Schema.String, Schema.String), notices: NonNegativeInt })),
    citations: Citations
  }),
  failure: Schema.Union([UnknownValue, PeriodOutOfRange, ...DataErrors]),
  failureMode: "return"
}).annotate(Tool.Title, "Eviction notice counts")

export const EvictionGrounds = Tool.make("eviction_grounds", {
  description:
    "List the grounds an eviction notice can give, as the Eviction Notices data names them, each with the reason and Rent Ordinance section that the Rent Board's annual report on eviction notices gives for it. Use the label and section as given; do not characterize the grounds.",
  success: Schema.Struct({
    grounds: Schema.Array(
      Schema.Struct({ key: Schema.String, label: Schema.String, section: Schema.NullOr(Schema.String) })
    ),
    citations: Citations
  }),
  failure: Schema.Union([...DataErrors]),
  failureMode: "return"
}).annotate(Tool.Title, "Eviction grounds")

/** A date outside the periods the allowable rent increase data covers. */
export class DateOutOfRange extends Schema.TaggedError<DateOutOfRange>()("DateOutOfRange", {
  requested: IsoDate,
  coveredFrom: IsoDate,
  coveredTo: IsoDate
}) {}

const RentIncreasePeriod = Schema.Struct({
  effectiveFrom: IsoDate,
  effectiveTo: IsoDate,
  percent: Schema.Finite.annotate({ description: "The most the base rent may rise in the period, in percent" })
})

export const AllowableRentIncrease = Tool.make("allowable_rent_increase", {
  description:
    "The Rent Board's annual allowable rent increase for rent-controlled units: the most a landlord may raise a " +
    "tenant's base rent once a year, in percent. It gives the rate only: how the rate is set is in the rent " +
    "ordinance, not this data. Each rate runs from its effective date to the day before the next: " +
    "say which period applies. With no date, it returns the latest period published. It is the annual amount only: " +
    "banked increases and increases for capital improvements or utilities are separate, and units outside rent " +
    "control are not covered.",
  parameters: Schema.Struct({
    on: OptionalParam(IsoDate.annotate({ description: "A date, as YYYY-MM-DD, to give the rate in effect on" })),
    fromYear: OptionalParam(
      PositiveInt.annotate({ description: "Also list every period starting in this year or later" })
    )
  }),
  success: Schema.Struct({
    period: RentIncreasePeriod,
    history: Schema.Array(RentIncreasePeriod),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: Schema.Union([DateOutOfRange, ...DataErrors]),
  failureMode: "return"
}).annotate(Tool.Title, "Annual allowable rent increase")

export const SfDataToolkit = Toolkit.make(
  DevelopmentPipelineProjects,
  DevelopmentPipelineSummary,
  AffordablePipelineProjects,
  AffordablePipelineSummary,
  AffordablePipelineUnitsByIncomeBand,
  ProjectHazardExposure,
  DatasetInfo,
  EvictionNoticeCounts,
  EvictionGrounds,
  AllowableRentIncrease
)
