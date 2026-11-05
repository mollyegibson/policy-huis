import { Effect } from "effect"

import { datasetCitation, UnknownValue } from "@policyhuis/mcp-kit"

import { HousingRepo } from "./HousingRepo.ts"
import { SfHousingToolkit } from "./Tools.ts"

/** Results list at most this many projects when the caller gives no limit; totals always cover every match. */
const DEFAULT_LIMIT = 20

/** Dataset keys in citations are namespaced by node, so they stay unique across every server's citations. */
const citationKey = (datasetKey: string) => `sf.${datasetKey}`

export const SfHousingHandlers = SfHousingToolkit.toLayer(
  Effect.gen(function* () {
    const repo = yield* HousingRepo

    const cite = Effect.fn("cite")(function* (
      datasetKeys: ReadonlyArray<string>,
      tool: string,
      parameters: Readonly<Record<string, unknown>>
    ) {
      const datasets = yield* repo.datasets().pipe(Effect.orDie)
      return yield* Effect.forEach(datasetKeys, (key) => {
        const dataset = datasets.find((d) => d.datasetKey === key)
        return dataset === undefined
          ? Effect.die(`dataset ${key} has not been loaded`)
          : Effect.succeed(
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
      })
    })

    const dataAsOf = Effect.fn("dataAsOf")(function* (datasetKey: string) {
      const datasets = yield* repo.datasets().pipe(Effect.orDie)
      const dataset = datasets.find((d) => d.datasetKey === datasetKey)
      return dataset === undefined
        ? yield* Effect.die(`dataset ${datasetKey} has not been loaded`)
        : dataset.sourceVersion
    })

    const snapshot = repo.snapshot().pipe(
      Effect.orDie,
      Effect.flatMap((s) =>
        s === null ? Effect.die("the development pipeline has not been loaded") : Effect.succeed(s)
      )
    )

    /** Fails with `UnknownValue`, listing the valid values, when an input is not one the loaded data contains. */
    const check = Effect.fn("check")(function* (
      field: string,
      value: string | number | undefined,
      valid: Effect.Effect<ReadonlyArray<string>, unknown>
    ) {
      if (value === undefined) return
      const values = yield* Effect.orDie(valid)
      if (!values.includes(String(value))) {
        return yield* new UnknownValue({ field, value: String(value), validValues: values })
      }
    })

    return {
      development_pipeline_projects: Effect.fn("development_pipeline_projects")(function* (params) {
        yield* check("status", params.status, repo.developmentStatuses())
        yield* check("neighborhood", params.neighborhood, repo.neighborhoods())
        yield* check("supervisorDistrict", params.supervisorDistrict, repo.districts())
        const { total, projects } = yield* repo
          .developmentProjects(params, params.limit ?? DEFAULT_LIMIT)
          .pipe(Effect.orDie)
        return {
          totalMatching: total,
          snapshot: yield* snapshot,
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
          citations: yield* cite(["development_pipeline"], "development_pipeline_projects", params)
        }
      }),

      development_pipeline_summary: Effect.fn("development_pipeline_summary")(function* (params) {
        yield* check("status", params.status, repo.developmentStatuses())
        const groups = yield* repo
          .developmentSummary(params.groupBy, params.status, params.affordableOnly ?? false)
          .pipe(Effect.orDie)
        return {
          groups,
          snapshot: yield* snapshot,
          citations: yield* cite(["development_pipeline"], "development_pipeline_summary", params)
        }
      }),

      affordable_pipeline_projects: Effect.fn("affordable_pipeline_projects")(function* (params) {
        yield* check("status", params.status, repo.affordableStatuses())
        yield* check("neighborhood", params.neighborhood, repo.neighborhoods())
        yield* check("supervisorDistrict", params.supervisorDistrict, repo.districts())
        const { total, projects } = yield* repo
          .affordableProjects(params, params.limit ?? DEFAULT_LIMIT)
          .pipe(Effect.orDie)
        return {
          totalMatching: total,
          projects,
          dataAsOf: yield* dataAsOf("affordable_pipeline"),
          citations: yield* cite(["affordable_pipeline"], "affordable_pipeline_projects", params)
        }
      }),

      affordable_pipeline_summary: Effect.fn("affordable_pipeline_summary")(function* (params) {
        yield* check("status", params.status, repo.affordableStatuses())
        const groups = yield* repo.affordableSummary(params.groupBy, params.status).pipe(Effect.orDie)
        return {
          groups,
          dataAsOf: yield* dataAsOf("affordable_pipeline"),
          citations: yield* cite(["affordable_pipeline"], "affordable_pipeline_summary", params)
        }
      }),

      project_hazard_exposure: Effect.fn("project_hazard_exposure")(function* (params) {
        const zone = yield* repo.zone(params.zone).pipe(Effect.orDie)
        if (zone === null) return yield* Effect.die(`zone ${params.zone} has not been loaded`)
        const { totals, projects } = yield* repo
          .exposure(params.zone, params.projects, params.affordableOnly ?? false, params.limit ?? DEFAULT_LIMIT)
          .pipe(Effect.orDie)
        if (totals === undefined) return yield* Effect.die("exposure totals query returned no row")
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
          citations: yield* cite([params.projects, params.zone], "project_hazard_exposure", params)
        }
      }),

      dataset_info: Effect.fn("dataset_info")(function* (params) {
        const datasets = yield* repo.datasets().pipe(Effect.orDie)
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
            selected.map((d) => d.datasetKey),
            "dataset_info",
            params
          )
        }
      })
    }
  })
)
