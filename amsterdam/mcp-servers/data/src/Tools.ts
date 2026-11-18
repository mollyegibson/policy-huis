import { Schema } from "effect"
import { Tool, Toolkit } from "effect/ai"

import { Citation } from "./Citations.ts"
import { IsoDate, NonNegativeInt, PositiveInt, Postcode, Year } from "./Formats.ts"
import { OptionalParam } from "./Params.ts"
import { DataErrors, UnknownValue } from "./ToolErrors.ts"

const Citations = Schema.Array(Citation)

/** What a tool returns to the model instead of a result: an input the data does not contain, or data it cannot read. */
const ToolFailure = Schema.Union([UnknownValue, ...DataErrors])

const District = Schema.String.annotate({ description: "A district of Amsterdam, as listed in tool results" })
const Neighborhood = Schema.String.annotate({ description: "A neighborhood of Amsterdam, as listed in tool results" })
const RoomType = Schema.String.annotate({
  description:
    "A room type of a short-term rental listing, as listed by short_term_rentals_summary grouped by room_type"
})
const LabelClass = Schema.String.annotate({
  description: "An energy label class, as listed by energy_labels_summary grouped by label_class"
})
const BuildYearBand = Schema.String.annotate({
  description: "A construction period of a building, as listed by energy_labels_summary grouped by build_year_band"
})
const Limit = Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 50 })))

const TenureUnits = Schema.Struct({
  socialRent: Schema.NullOr(NonNegativeInt),
  midRent: Schema.NullOr(NonNegativeInt),
  privateRent: Schema.NullOr(NonNegativeInt),
  ownerOccupied: Schema.NullOr(NonNegativeInt),
  other: Schema.NullOr(NonNegativeInt)
})

const PlannedProject = Schema.Struct({
  projectId: Schema.String,
  name: Schema.String,
  district: Schema.NullOr(Schema.String),
  area: Schema.NullOr(Schema.String),
  neighborhood: Schema.NullOr(Schema.String),
  publicationStage: Schema.NullOr(Schema.String),
  constructionStartPlanned: Schema.NullOr(IsoDate),
  constructionStartRealised: Schema.NullOr(IsoDate),
  totalUnits: NonNegativeInt,
  plannedUnitsByTenure: TenureUnits
})

export const PlannedHousingProjects = Tool.make("planned_housing_projects", {
  description:
    "List Amsterdam's planned housing projects, with the units each plans by tenure: social rent, mid rent, private " +
    "rent, owner occupied, and other tenures such as student and temporary homes. The plans are the city's register " +
    "of new-build plans on one peildatum, the as-of date of the snapshot: say which date you use. Planned units are " +
    "not built units, and a plan can change or shrink before construction starts.",
  parameters: Schema.Struct({
    district: OptionalParam(District),
    neighborhood: OptionalParam(Neighborhood),
    minUnits: OptionalParam(NonNegativeInt),
    buildingFrom: OptionalParam(
      Year.annotate({ description: "Also list plans starting to build in this year or later" })
    ),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    projects: Schema.Array(PlannedProject),
    snapshot: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Planned housing projects")

export const PlannedHousingSummary = Tool.make("planned_housing_summary", {
  description:
    "Total Amsterdam's planned housing projects and the units they plan, by district, neighborhood or year of " +
    "planned construction start, with each group's units by tenure: social rent, mid rent, private rent, owner " +
    "occupied and other tenures. The plans are one snapshot of the city's register: say which date. Units planned " +
    "are not units built.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["district", "neighborhood", "planned_start_year"]),
    district: OptionalParam(District),
    neighborhood: OptionalParam(Neighborhood)
  }),
  success: Schema.Struct({
    groups: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        projects: NonNegativeInt,
        totalUnits: NonNegativeInt,
        unitsSocialRent: NonNegativeInt,
        unitsMidRent: NonNegativeInt,
        unitsPrivateRent: NonNegativeInt,
        unitsOwnerOccupied: NonNegativeInt,
        unitsOther: NonNegativeInt
      })
    ),
    snapshot: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Planned housing totals")

export const EnergyLabelsSummary = Tool.make("energy_labels_summary", {
  description:
    "Count the energy labels registered for Amsterdam addresses, by label class or by the building's construction " +
    "period. The register holds one label per thermally zoned part of a building, so a building can hold several " +
    "labels: count labels, not buildings. A label says how energy efficient a home was when it was registered, and " +
    "an efficient label is not proof the home still performs that way. Say which load of the register the counts " +
    "come from, and give its date.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["label_class", "build_year_band"]),
    labelClass: OptionalParam(LabelClass),
    buildYearBand: OptionalParam(BuildYearBand)
  }),
  success: Schema.Struct({
    groups: Schema.Array(Schema.Struct({ key: Schema.String, labels: NonNegativeInt })),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Energy label counts")

export const EnergyLabelAtAddress = Tool.make("energy_label_at_address", {
  description:
    "The energy labels registered at a postcode and house number in Amsterdam. The register can hold several labels " +
    "for one address, one per thermally zoned part of the building: give each with its class and registration date. " +
    "A label runs out, so say the date it was registered and that a newer state of the home is not in the data.",
  parameters: Schema.Struct({
    postcode: Postcode.annotate({ description: "The postcode of the address, as digits and letters" }),
    houseNumber: PositiveInt.annotate({ description: "The house number of the address" })
  }),
  success: Schema.Struct({
    found: Schema.Boolean,
    labels: Schema.Array(
      Schema.Struct({
        labelClass: Schema.String,
        label: Schema.String,
        buildYear: Schema.NullOr(Schema.Int),
        buildYearBand: Schema.NullOr(Schema.String),
        registeredOn: IsoDate,
        validUntil: Schema.NullOr(IsoDate),
        surface: Schema.NullOr(Schema.Finite)
      })
    ),
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Energy label at an address")

const RentalListing = Schema.Struct({
  listingId: Schema.String,
  name: Schema.NullOr(Schema.String),
  roomType: Schema.String,
  neighbourhood: Schema.NullOr(Schema.String),
  nightlyPrice: Schema.NullOr(Schema.Finite),
  minimumNights: Schema.NullOr(NonNegativeInt),
  nightsAvailable: Schema.NullOr(NonNegativeInt),
  estimatedOccupancyNights: Schema.NullOr(NonNegativeInt),
  estimatedRevenue: Schema.NullOr(Schema.Finite),
  registration: Schema.NullOr(Schema.String),
  registered: Schema.Boolean,
  hostListingsCount: Schema.NullOr(NonNegativeInt)
})

export const ShortTermRentals = Tool.make("short_term_rentals", {
  description:
    "List Amsterdam's short-term rental listings as one day's scrape of Inside Airbnb recorded them, with the " +
    "nightly price, the room type, the least nights the host requires, the nights the listing says it is available " +
    "in the coming year, and the registration the host gives. A listing is an advertisement, not a permit: nights " +
    "offered are not nights stayed, and the registration is as the host records it. Say which day the scrape is " +
    "from.",
  parameters: Schema.Struct({
    neighbourhood: OptionalParam(
      Schema.String.annotate({ description: "A neighborhood area of a listing, as listed in tool results" })
    ),
    roomType: OptionalParam(RoomType),
    registeredOnly: OptionalParam(Schema.Boolean),
    minNightlyPrice: OptionalParam(Schema.Finite),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    listings: Schema.Array(RentalListing),
    snapshot: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Short-term rental listings")

export const ShortTermRentalsSummary = Tool.make("short_term_rentals_summary", {
  description:
    "Total Amsterdam's short-term rental listings on Inside Airbnb, and the nights they advertise, by room type or " +
    "neighborhood area, with how many listings give a registration. One day's scrape: say which. Nights advertised " +
    "are not nights stayed, and a listing that gives no registration is not thereby unlawful.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["room_type", "neighbourhood"]),
    neighbourhood: OptionalParam(
      Schema.String.annotate({ description: "A neighborhood area of a listing, as listed in tool results" })
    ),
    roomType: OptionalParam(RoomType)
  }),
  success: Schema.Struct({
    groups: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        listings: NonNegativeInt,
        nightsAvailable: NonNegativeInt,
        withRegistration: NonNegativeInt
      })
    ),
    snapshot: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Short-term rental totals")

const AreaLevel = Schema.Literals(["gemeente", "wijk", "buurt"]).annotate({
  description: "An area level of the CBS key figures: the whole city, a wijk, or a buurt within a wijk"
})

const HousingMeasure = Schema.Literals([
  "housing_stock",
  "pct_owner_occupied",
  "pct_rent",
  "pct_corporation_owned",
  "average_woz_value_thousand_eur",
  "pct_built_last_ten_years"
]).annotate({ description: "A housing measure to rank areas by, highest first" })

const HousingArea = Schema.Struct({
  level: Schema.String,
  code: Schema.String,
  name: Schema.String,
  neighborhood: Schema.NullOr(Schema.String),
  housingStock: NonNegativeInt,
  newHomes: Schema.NullOr(NonNegativeInt),
  pctVacantHomes: Schema.NullOr(Schema.Finite),
  pctOwnerOccupied: Schema.NullOr(Schema.Finite),
  pctRent: Schema.NullOr(Schema.Finite),
  pctCorporationOwned: Schema.NullOr(Schema.Finite),
  pctOtherLandlordOwned: Schema.NullOr(Schema.Finite),
  averageWozValueThousandEur: Schema.NullOr(Schema.Finite),
  pctSingleFamilyHomes: Schema.NullOr(Schema.Finite),
  pctMultiFamilyHomes: Schema.NullOr(Schema.Finite),
  pctBuiltLastTenYears: Schema.NullOr(Schema.Finite),
  averageGasUseM3: Schema.NullOr(Schema.Finite),
  pctDistrictHeating: Schema.NullOr(Schema.Finite),
  pctHomesWithoutGas: Schema.NullOr(Schema.Finite),
  pctHomesWithSolarPower: Schema.NullOr(Schema.Finite),
  pctHomesMainlyElectricHeating: Schema.NullOr(Schema.Finite)
})

export const HousingStock = Tool.make("housing_stock", {
  description:
    "Amsterdam's housing stock from CBS's key figures: how many homes an area holds, the share owned and rented, " +
    "the share owned by housing corporations, the average WOZ value, dwelling type, how much was built in the last " +
    "ten years, and the share vacant, heated without gas, or with solar panels. CBS reports for the city, its " +
    "wijken and its buurten, and has no stadsdeel. Give a level and an area for one area, or a level alone to list " +
    "its areas ranked by a measure, highest first. Shares are percentages of an area's homes, and CBS leaves one " +
    "out where the area is too small to publish.",
  parameters: Schema.Struct({
    areaLevel: OptionalParam(AreaLevel),
    area: OptionalParam(
      Schema.String.annotate({
        description: "A wijk or buurt name, as listed in tool results; omit it for the whole city or every area"
      })
    ),
    sortBy: OptionalParam(HousingMeasure),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    areas: Schema.Array(HousingArea),
    totalMatching: NonNegativeInt,
    sourceVersion: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
}).annotate(Tool.Title, "Housing stock and tenure")

/**
 * A dataset key: one of `datasetKeys` when the loaded datasets were read at startup, so the model is offered only keys
 * that exist, or any text when they could not be.
 */
const DatasetKey = (datasetKeys: ReadonlyArray<string>) =>
  (datasetKeys.length === 0 ? Schema.String : Schema.Literals(datasetKeys)).annotate({
    description: "A dataset's key; omit it to describe every loaded dataset"
  })

const datasetInfo = (datasetKeys: ReadonlyArray<string>) =>
  Tool.make("dataset_info", {
    description:
      "Describe the loaded datasets: source, license, version, load date, and the publisher's own description, which " +
      "states the data's limits in the publisher's words. Quote it when a user asks how current or reliable the data " +
      "is.",
    parameters: Schema.Struct({ dataset: OptionalParam(DatasetKey(datasetKeys)) }),
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

/**
 * The server's tools, with `dataset_info`'s `dataset` limited to `datasetKeys`, the datasets loaded when the server
 * starts; with none, it takes any text. Built at startup from `ams_data.datasets`.
 */
export const makeAmsDataToolkit = (datasetKeys: ReadonlyArray<string>) =>
  Toolkit.make(
    PlannedHousingProjects,
    PlannedHousingSummary,
    EnergyLabelsSummary,
    EnergyLabelAtAddress,
    ShortTermRentals,
    ShortTermRentalsSummary,
    HousingStock,
    datasetInfo(datasetKeys)
  )

export type AmsDataToolkit = ReturnType<typeof makeAmsDataToolkit>
