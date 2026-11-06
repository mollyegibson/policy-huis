import { Schema } from "effect"
import { Tool, Toolkit } from "effect/ai"

import { DataErrors, IsoDate, NonNegativeInt, PositiveInt, UnknownValue } from "@policyhuis/mcp-kit"
import { Citation } from "@policyhuis/protocol/Citation"

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
    status: Schema.optional(DevelopmentStatus),
    neighborhood: Schema.optional(NeighborhoodName),
    supervisorDistrict: Schema.optional(SupervisorDistrict),
    minAffordableUnits: Schema.optional(NonNegativeInt),
    inStatusSinceBefore: Schema.optional(IsoDate),
    approvedBefore: Schema.optional(IsoDate),
    limit: Schema.optional(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    projects: Schema.Array(DevelopmentProject),
    snapshot: Schema.String,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const DevelopmentPipelineSummary = Tool.make("development_pipeline_summary", {
  description:
    "Total the development pipeline's projects, net units and affordable units by status, neighborhood, district or year of Planning approval, from one quarterly snapshot: say which.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["status", "neighborhood", "district", "approval_year"]),
    status: Schema.optional(DevelopmentStatus),
    affordableOnly: Schema.optional(Schema.Boolean)
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
})

export const AffordablePipelineProjects = Tool.make("affordable_pipeline_projects", {
  description:
    "List MOHCD-supported affordable housing projects, with units by income band and construction dates. Construction start and completion dates are MOHCD's estimates and some have passed: say so when you use them.",
  parameters: Schema.Struct({
    status: Schema.optional(AffordableStatus),
    neighborhood: Schema.optional(NeighborhoodName),
    supervisorDistrict: Schema.optional(SupervisorDistrict),
    minUnits: Schema.optional(PositiveInt),
    estimatedStartBefore: Schema.optional(IsoDate),
    limit: Schema.optional(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    projects: Schema.Array(AffordableProject),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const AffordablePipelineSummary = Tool.make("affordable_pipeline_summary", {
  description:
    "Total MOHCD's affordable pipeline projects and their affordable units by status, construction stage, neighborhood or district. For units by income band, use affordable_pipeline_units_by_income_band.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["status", "construction_status", "neighborhood", "district"]),
    status: Schema.optional(AffordableStatus)
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
})

export const AffordablePipelineUnitsByIncomeBand = Tool.make("affordable_pipeline_units_by_income_band", {
  description:
    "Total MOHCD's affordable pipeline units in each income band, as a share of area median income (AMI), with how many projects have units in that band. Bands are named as MOHCD's dataset names its columns, such as _50_ami for 50% of AMI. A project with units in several bands is counted in each, so the project counts do not add up to the number of projects.",
  parameters: Schema.Struct({ status: Schema.optional(AffordableStatus) }),
  success: Schema.Struct({
    bands: Schema.Array(
      Schema.Struct({ amiBand: Schema.String, projects: NonNegativeInt, unitsInBand: NonNegativeInt })
    ),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const ProjectHazardExposure = Tool.make("project_hazard_exposure", {
  description:
    "List pipeline projects inside one flood or exposure zone. Each zone answers a different question (stormwater flooding, an extreme sea-level-rise scenario, or where new housing needs enhanced ventilation); never combine them into one risk. Name the zone, its publisher and date. Projects without a location are counted, not checked.",
  parameters: Schema.Struct({
    zone: HazardZoneKey,
    projects: ProjectSource,
    affordableOnly: Schema.optional(Schema.Boolean),
    limit: Schema.optional(Limit)
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
      Schema.Struct({ id: Schema.String, name: Schema.String, status: Schema.String, affordableUnits: NonNegativeInt })
    ),
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const DatasetInfo = Tool.make("dataset_info", {
  description:
    "Describe the loaded datasets: source, license, version, load date, and the publisher's own description, which states the data's limits in the publisher's words. Quote it when a user asks how current or reliable the data is.",
  parameters: Schema.Struct({ dataset: Schema.optional(Schema.String) }),
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
})

export const SfHousingToolkit = Toolkit.make(
  DevelopmentPipelineProjects,
  DevelopmentPipelineSummary,
  AffordablePipelineProjects,
  AffordablePipelineSummary,
  AffordablePipelineUnitsByIncomeBand,
  ProjectHazardExposure,
  DatasetInfo
)
