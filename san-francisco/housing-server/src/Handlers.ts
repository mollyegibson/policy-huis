import { Effect } from "effect"

import { datasetCitation, DataUnavailable, UnknownValue, withDataErrors } from "@policyhuis/mcp-kit"

import type { DatasetRow } from "./HousingRepo.ts"
import { HousingRepo } from "./HousingRepo.ts"
import { SfHousingToolkit } from "./Tools.ts"

/** Results list at most this many projects when the caller gives no limit; totals always cover every match. */
const DEFAULT_LIMIT = 20

/** Dataset keys in citations are namespaced by node, so they stay unique across every server's citations. */
const citationKey = (datasetKey: string) => `sf.${datasetKey}`

const DEVELOPMENT = ["development_pipeline"]
const AFFORDABLE = ["affordable_pipeline"]

export const SfHousingHandlers = SfHousingToolkit.toLayer(
  Effect.gen(function* () {
    const repo = yield* HousingRepo

    /** The dataset with this key among the loaded `datasets`, or `DataUnavailable` when it has not been loaded. */
    const loadedDataset = (datasets: ReadonlyArray<DatasetRow>, datasetKey: string) => {
      const dataset = datasets.find((d) => d.datasetKey === datasetKey)
      return dataset === undefined
        ? Effect.fail(new DataUnavailable({ datasets: [datasetKey] }))
        : Effect.succeed(dataset)
    }

    /** One citation per dataset key, from the loaded `datasets`, for the query `tool` ran with `parameters`. */
    const cite = (
      datasets: ReadonlyArray<DatasetRow>,
      datasetKeys: ReadonlyArray<string>,
      tool: string,
      parameters: Readonly<Record<string, unknown>>
    ) =>
      Effect.forEach(datasetKeys, (key) =>
        Effect.map(loadedDataset(datasets, key), (dataset) =>
          datasetCitation({
            datasetKey: citationKey(dataset.datasetKey),
            title: dataset.title,
            publisher: dataset.publisher,
            sourceUrl: dataset.sourceUrl,
            sourceVersion: dataset.sourceVersion,
            tool,
            parameters
          })
        )
      )

    const snapshot = Effect.fn("SfHousing.snapshot")(function* () {
      const latest = yield* repo.snapshot()
      if (latest === null) return yield* new DataUnavailable({ datasets: DEVELOPMENT })
      return latest
    })

    /** Fails with `UnknownValue`, listing the valid values, when an input is not one the loaded data contains. */
    const check = Effect.fn("SfHousing.check")(function* <E>(
      field: string,
      value: string | number | undefined,
      valid: Effect.Effect<ReadonlyArray<string>, E>
    ) {
      if (value === undefined) return
      const values = yield* valid
      if (!values.includes(String(value))) {
        return yield* new UnknownValue({ field, value: String(value), validValues: values })
      }
    })

    return {
      development_pipeline_projects: Effect.fn("SfHousing.development_pipeline_projects")(
        function* (params) {
          const datasets = yield* repo.datasets()
          const latest = yield* snapshot()
          yield* check("status", params.status, repo.developmentStatuses(latest))
          yield* check("neighborhood", params.neighborhood, repo.neighborhoods())
          yield* check("supervisorDistrict", params.supervisorDistrict, repo.districts())
          const { total, projects } = yield* repo.developmentProjects(latest, params, params.limit ?? DEFAULT_LIMIT)
          return {
            totalMatching: total,
            snapshot: latest,
            projects: projects.map((p) => ({
              projectKey: p.projectKey,
              blockLot: p.blockLot,
              nameOrAddress: p.nameOrAddress,
              status: p.status,
              statusSince: p.statusSince,
              daysInStatus: p.daysInStatus,
              planningApprovedOn: p.planningApprovedOn,
              netUnits: p.netUnits,
              affordableUnits: p.affordableUnits,
              affordableUnitsByLevel: {
                extremelyLow: p.unitsExtremelyLow,
                veryLow: p.unitsVeryLow,
                low: p.unitsLow,
                moderate: p.unitsModerate
              },
              neighborhood: p.neighborhood,
              supervisorDistrict: p.supervisorDistrict
            })),
            citations: yield* cite(datasets, DEVELOPMENT, "development_pipeline_projects", params)
          }
        },
        withDataErrors(() => DEVELOPMENT)
      ),

      development_pipeline_summary: Effect.fn("SfHousing.development_pipeline_summary")(
        function* (params) {
          const datasets = yield* repo.datasets()
          const latest = yield* snapshot()
          yield* check("status", params.status, repo.developmentStatuses(latest))
          const groups = yield* repo.developmentSummary(
            latest,
            params.groupBy,
            params.status,
            params.affordableOnly ?? false
          )
          return {
            groups,
            snapshot: latest,
            citations: yield* cite(datasets, DEVELOPMENT, "development_pipeline_summary", params)
          }
        },
        withDataErrors(() => DEVELOPMENT)
      ),

      affordable_pipeline_projects: Effect.fn("SfHousing.affordable_pipeline_projects")(
        function* (params) {
          const datasets = yield* repo.datasets()
          yield* check("status", params.status, repo.affordableStatuses())
          yield* check("neighborhood", params.neighborhood, repo.neighborhoods())
          yield* check("supervisorDistrict", params.supervisorDistrict, repo.districts())
          const { total, projects } = yield* repo.affordableProjects(params, params.limit ?? DEFAULT_LIMIT)
          return {
            totalMatching: total,
            projects,
            dataAsOf: (yield* loadedDataset(datasets, "affordable_pipeline")).sourceVersion,
            citations: yield* cite(datasets, AFFORDABLE, "affordable_pipeline_projects", params)
          }
        },
        withDataErrors(() => AFFORDABLE)
      ),

      affordable_pipeline_summary: Effect.fn("SfHousing.affordable_pipeline_summary")(
        function* (params) {
          const datasets = yield* repo.datasets()
          yield* check("status", params.status, repo.affordableStatuses())
          const groups = yield* repo.affordableSummary(params.groupBy, params.status)
          return {
            groups,
            dataAsOf: (yield* loadedDataset(datasets, "affordable_pipeline")).sourceVersion,
            citations: yield* cite(datasets, AFFORDABLE, "affordable_pipeline_summary", params)
          }
        },
        withDataErrors(() => AFFORDABLE)
      ),

      affordable_pipeline_units_by_income_band: Effect.fn("SfHousing.affordable_pipeline_units_by_income_band")(
        function* (params) {
          const datasets = yield* repo.datasets()
          yield* check("status", params.status, repo.affordableStatuses())
          const bands = yield* repo.affordableUnitsByIncomeBand(params.status)
          return {
            bands,
            dataAsOf: (yield* loadedDataset(datasets, "affordable_pipeline")).sourceVersion,
            citations: yield* cite(datasets, AFFORDABLE, "affordable_pipeline_units_by_income_band", params)
          }
        },
        withDataErrors(() => AFFORDABLE)
      ),

      project_hazard_exposure: Effect.fn("SfHousing.project_hazard_exposure")(
        function* (params) {
          const datasets = yield* repo.datasets()
          const zone = yield* repo.zone(params.zone)
          if (zone === null) return yield* new DataUnavailable({ datasets: [params.zone] })
          const from =
            params.projects === "development_pipeline"
              ? { source: params.projects, snapshot: yield* snapshot() }
              : { source: params.projects }
          const { totals, projects } = yield* repo.exposure(
            params.zone,
            from,
            params.affordableOnly ?? false,
            params.limit ?? DEFAULT_LIMIT
          )
          return {
            zone: {
              key: params.zone,
              name: zone.name,
              publisher: zone.publisher,
              sourceEditedAt: zone.sourceEditedAt,
              publisherDescription: zone.publisherDescription
            },
            ...totals,
            projects,
            citations: yield* cite(datasets, [params.projects, params.zone], "project_hazard_exposure", params)
          }
        },
        withDataErrors((params) => [params.projects, params.zone])
      ),

      dataset_info: Effect.fn("SfHousing.dataset_info")(
        function* (params) {
          const datasets = yield* repo.datasets()
          yield* check("dataset", params.dataset, Effect.succeed(datasets.map((d) => d.datasetKey)))
          const selected = datasets.filter((d) => params.dataset === undefined || d.datasetKey === params.dataset)
          return {
            datasets: selected.map((d) => ({
              key: d.datasetKey,
              title: d.title,
              publisher: d.publisher,
              sourceUrl: d.sourceUrl,
              license: d.license,
              sourceVersion: d.sourceVersion,
              publisherDescription: d.publisherDescription
            })),
            citations: yield* cite(
              datasets,
              selected.map((d) => d.datasetKey),
              "dataset_info",
              params
            )
          }
        },
        withDataErrors((params) => (params.dataset === undefined ? [] : [params.dataset]))
      )
    }
  })
)
