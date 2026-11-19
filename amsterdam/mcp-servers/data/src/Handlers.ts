import { Effect } from "effect"

import { datasetCitation } from "./Citations.ts"
import type { DatasetRow } from "./HousingRepo.ts"
import { HousingRepo } from "./HousingRepo.ts"
import * as Locators from "./Locators.ts"
import { DataUnavailable, UnknownValue, withDataErrors } from "./ToolErrors.ts"
import type { AmsDataToolkit } from "./Tools.ts"

/** Results list at most this many rows when the caller gives no limit; totals always cover every match. */
const DEFAULT_LIMIT = 20

const PLANNED = ["nieuwbouwplannen"]
const RENTALS = ["inside_airbnb_listings"]
const LABELS = ["ep_online_energielabels"]
const STOCK = ["cbs_kerncijfers"]

/** The handlers of `toolkit`, whichever dataset keys it offers; a tool's handler is found by its name. */
export const AmsDataHandlers = (toolkit: AmsDataToolkit) =>
  toolkit.toLayer(
    Effect.gen(function* () {
      const repo = yield* HousingRepo

      /** The dataset with this key among the loaded `datasets`, or `DataUnavailable` when it has not been loaded. */
      const loadedDataset = (datasets: ReadonlyArray<DatasetRow>, datasetKey: string) => {
        const dataset = datasets.find((d) => d.datasetKey === datasetKey)
        return dataset === undefined
          ? Effect.fail(new DataUnavailable({ datasets: [datasetKey] }))
          : Effect.succeed(dataset)
      }

      /**
       * One citation per dataset key, from the loaded `datasets`, for the query `tool` ran with `parameters`, which
       * `locator` describes. `jurisdiction` is set when the query rests only on the part of a source that covers one
       * place, which a district filter does.
       */
      const cite = (
        datasets: ReadonlyArray<DatasetRow>,
        datasetKeys: ReadonlyArray<string>,
        tool: string,
        parameters: Readonly<Record<string, unknown>>,
        locator: string,
        jurisdiction?: string
      ) =>
        Effect.forEach(datasetKeys, (key) =>
          Effect.map(loadedDataset(datasets, key), (dataset) =>
            datasetCitation({
              datasetKey: dataset.datasetKey,
              title: dataset.title,
              publisher: dataset.publisher,
              sourceUrl: dataset.sourceUrl,
              sourceVersion: dataset.sourceVersion,
              tool,
              parameters,
              locator,
              jurisdiction
            })
          )
        )

      /** The latest planned-housing snapshot, or `DataUnavailable` when none is loaded. */
      const plannedSnapshot = Effect.fn("AmsData.plannedSnapshot")(function* () {
        const latest = yield* repo.plannedSnapshot()
        if (latest === null) return yield* new DataUnavailable({ datasets: PLANNED })
        return latest
      })

      /** Fails with `UnknownValue`, listing the valid values, when an input is not one the loaded data contains. */
      const check = Effect.fn("AmsData.check")(function* <E>(
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
        planned_housing_projects: Effect.fn("AmsData.planned_housing_projects")(
          function* (params) {
            const datasets = yield* repo.datasets()
            const snapshot = yield* plannedSnapshot()
            yield* check("district", params.district, repo.districts())
            yield* check("neighborhood", params.neighborhood, repo.neighborhoods())
            const { total, projects } = yield* repo.plannedProjects(params, params.limit ?? DEFAULT_LIMIT)
            return {
              totalMatching: total,
              snapshot,
              projects: projects.map((p) => ({
                projectId: p.projectId,
                name: p.name,
                district: p.district,
                area: p.gebied,
                neighborhood: p.wijk,
                publicationStage: p.publicationStage,
                constructionStartPlanned: p.constructionStartPlanned,
                constructionStartRealised: p.constructionStartRealised,
                totalUnits: p.totalUnits,
                plannedUnitsByTenure: {
                  socialRent: p.unitsSocialRent,
                  midRent: p.unitsMidRent,
                  privateRent: p.unitsPrivateRent,
                  ownerOccupied: p.unitsOwnerOccupied,
                  other: p.unitsOther
                }
              })),
              citations: yield* cite(
                datasets,
                PLANNED,
                "planned_housing_projects",
                params,
                Locators.plannedProjects(params),
                params.district
              )
            }
          },
          withDataErrors(() => PLANNED)
        ),

        planned_housing_summary: Effect.fn("AmsData.planned_housing_summary")(
          function* (params) {
            const datasets = yield* repo.datasets()
            const snapshot = yield* plannedSnapshot()
            yield* check("district", params.district, repo.districts())
            yield* check("neighborhood", params.neighborhood, repo.neighborhoods())
            const groups = yield* repo.plannedSummary(params.groupBy, params)
            return {
              groups,
              snapshot,
              citations: yield* cite(
                datasets,
                PLANNED,
                "planned_housing_summary",
                params,
                Locators.plannedSummary(params),
                params.district
              )
            }
          },
          withDataErrors(() => PLANNED)
        ),

        energy_labels_summary: Effect.fn("AmsData.energy_labels_summary")(
          function* (params) {
            const datasets = yield* repo.datasets()
            const data = yield* loadedDataset(datasets, "ep_online_energielabels")
            yield* check("labelClass", params.labelClass, repo.labelClasses())
            yield* check("buildYearBand", params.buildYearBand, repo.buildYearBands())
            const groups = yield* repo.energyLabelsSummary(params.groupBy, params.labelClass, params.buildYearBand)
            return {
              groups,
              dataAsOf: data.sourceVersion,
              citations: yield* cite(
                datasets,
                LABELS,
                "energy_labels_summary",
                params,
                Locators.energyLabelsSummary(params)
              )
            }
          },
          withDataErrors(() => LABELS)
        ),

        energy_label_at_address: Effect.fn("AmsData.energy_label_at_address")(
          function* (params) {
            const datasets = yield* repo.datasets()
            yield* loadedDataset(datasets, "ep_online_energielabels")
            const labels = yield* repo.energyLabelAtAddress(params.postcode, params.houseNumber)
            return {
              found: labels.length > 0,
              labels,
              citations: yield* cite(
                datasets,
                LABELS,
                "energy_label_at_address",
                params,
                Locators.energyLabelAtAddress(params)
              )
            }
          },
          withDataErrors(() => LABELS)
        ),

        short_term_rentals: Effect.fn("AmsData.short_term_rentals")(
          function* (params) {
            const datasets = yield* repo.datasets()
            const data = yield* loadedDataset(datasets, "inside_airbnb_listings")
            yield* check("neighbourhood", params.neighbourhood, repo.rentalNeighbourhoods())
            yield* check("roomType", params.roomType, repo.rentalRoomTypes())
            const { total, listings } = yield* repo.rentalListings(params, params.limit ?? DEFAULT_LIMIT)
            return {
              totalMatching: total,
              snapshot: data.sourceVersion,
              listings,
              citations: yield* cite(datasets, RENTALS, "short_term_rentals", params, Locators.rentalListings(params))
            }
          },
          withDataErrors(() => RENTALS)
        ),

        short_term_rentals_summary: Effect.fn("AmsData.short_term_rentals_summary")(
          function* (params) {
            const datasets = yield* repo.datasets()
            const data = yield* loadedDataset(datasets, "inside_airbnb_listings")
            yield* check("neighbourhood", params.neighbourhood, repo.rentalNeighbourhoods())
            yield* check("roomType", params.roomType, repo.rentalRoomTypes())
            const groups = yield* repo.rentalSummary(params.groupBy, params)
            return {
              groups,
              snapshot: data.sourceVersion,
              citations: yield* cite(
                datasets,
                RENTALS,
                "short_term_rentals_summary",
                params,
                Locators.rentalSummary(params)
              )
            }
          },
          withDataErrors(() => RENTALS)
        ),

        housing_stock: Effect.fn("AmsData.housing_stock")(
          function* (params) {
            const datasets = yield* repo.datasets()
            const data = yield* loadedDataset(datasets, "cbs_kerncijfers")
            const areaLevel = params.areaLevel ?? "gemeente"
            const sortBy = params.sortBy ?? "housing_stock"
            const order = params.order ?? "highest"
            yield* check("area", params.area, repo.housingAreaNames(areaLevel))
            const { total, areas } = yield* repo.housingStock(
              { areaLevel, area: params.area, sortBy, order },
              params.limit ?? DEFAULT_LIMIT
            )
            return {
              areas,
              totalMatching: total,
              sourceVersion: data.sourceVersion,
              citations: yield* cite(
                datasets,
                STOCK,
                "housing_stock",
                params,
                Locators.housingStock({ areaLevel, area: params.area, sortBy: params.sortBy, order: params.order }),
                params.area
              )
            }
          },
          withDataErrors(() => STOCK)
        ),

        dataset_info: Effect.fn("AmsData.dataset_info")(
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
                params,
                Locators.datasetInfo()
              )
            }
          },
          withDataErrors((params) => (params.dataset === undefined ? [] : [params.dataset]))
        )
      }
    })
  )
