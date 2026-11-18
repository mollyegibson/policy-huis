/**
 * A citation's `locator`: what part of a dataset a result used, in words a reader can check against the source. The
 * subject is followed by the filters that were given, in order. Built from a tool's parameters only, so the same query
 * always has the same locator.
 */
export const phrase = (subject: string, filters: ReadonlyArray<string | null>): string =>
  [subject, ...filters.filter((f): f is string => f !== null)].join(", ")

const given = <A>(value: A | undefined, text: (value: A) => string) => (value === undefined ? null : text(value))

const GROUP_WORDS: Readonly<Record<string, string>> = {
  district: "district",
  neighborhood: "neighborhood",
  planned_start_year: "year of planned construction start",
  label_class: "label class",
  build_year_band: "the building's construction period",
  room_type: "room type",
  housing_stock: "the number of homes",
  pct_owner_occupied: "the share of owner-occupied homes",
  pct_rent: "the share of rented homes",
  pct_corporation_owned: "the share owned by housing corporations",
  average_woz_value_thousand_eur: "the average WOZ value",
  pct_built_last_ten_years: "the share built in the last ten years"
}

const groupWords = (key: string) => GROUP_WORDS[key] ?? key.replace(/_/g, " ")

export const plannedProjects = (p: {
  readonly district?: string
  readonly neighborhood?: string
  readonly minUnits?: number
  readonly buildingFrom?: string
}) =>
  phrase("Amsterdam planned housing projects", [
    given(p.district, (d) => `in the district of ${d}`),
    given(p.neighborhood, (n) => `in the neighborhood of ${n}`),
    given(p.minUnits, (n) => `planning at least ${String(n)} units`),
    given(p.buildingFrom, (y) => `planning to start building in ${y} or later`)
  ])

export const plannedSummary = (p: {
  readonly groupBy: string
  readonly district?: string
  readonly neighborhood?: string
}) =>
  phrase(`Amsterdam planned housing projects and units by ${groupWords(p.groupBy)}`, [
    given(p.district, (d) => `in the district of ${d}`),
    given(p.neighborhood, (n) => `in the neighborhood of ${n}`)
  ])

export const energyLabelsSummary = (p: {
  readonly groupBy: string
  readonly labelClass?: string
  readonly buildYearBand?: string
}) =>
  phrase(`Amsterdam's registered energy labels by ${groupWords(p.groupBy)}`, [
    given(p.labelClass, (c) => `of label class ${c}`),
    given(p.buildYearBand, (b) => `built in ${b}`)
  ])

export const energyLabelAtAddress = (p: { readonly postcode: string; readonly houseNumber: number }) =>
  phrase(`The energy label registered at ${p.postcode.toUpperCase()} ${String(p.houseNumber)}`, [])

export const rentalListings = (p: {
  readonly neighbourhood?: string
  readonly roomType?: string
  readonly registeredOnly?: boolean
  readonly minNightlyPrice?: number
}) =>
  phrase("Short-term rental listings on Inside Airbnb", [
    given(p.neighbourhood, (n) => `in ${n}`),
    given(p.roomType, (r) => `of room type ${r}`),
    given(p.minNightlyPrice, (m) => `at ${String(m)} a night or more`),
    p.registeredOnly === true ? "whose host gives a registration" : null
  ])

export const rentalSummary = (p: {
  readonly groupBy: string
  readonly neighbourhood?: string
  readonly roomType?: string
}) =>
  phrase(`Short-term rental listings on Inside Airbnb by ${groupWords(p.groupBy)}`, [
    given(p.neighbourhood, (n) => `in ${n}`),
    given(p.roomType, (r) => `of room type ${r}`)
  ])

export const datasetInfo = () => "The dataset's description, license and version"

const AREA_WORDS: Readonly<Record<string, string>> = {
  gemeente: "the whole city",
  wijk: "its wijken",
  buurt: "its buurten"
}

export const housingStock = (p: {
  readonly areaLevel: string
  readonly area?: string | undefined
  readonly sortBy?: string | undefined
}) =>
  phrase(`Amsterdam's housing stock from CBS key figures for ${AREA_WORDS[p.areaLevel] ?? p.areaLevel}`, [
    given(p.area, (a) => `in ${a}`),
    given(p.sortBy, (s) => `ranked by ${groupWords(s)}`)
  ])
