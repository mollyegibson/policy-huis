/**
 * A citation's `locator`: what part of a dataset a result used, in words a reader can check against the source. The
 * subject is followed by the filters that were given, in order. Built from a tool's parameters only, so the same query
 * always has the same locator.
 */
const phrase = (subject: string, filters: ReadonlyArray<string | null>) =>
  [subject, ...filters.filter((f): f is string => f !== null)].join(", ")

const given = <A>(value: A | undefined, text: (value: A) => string) => (value === undefined ? null : text(value))

const GROUP_WORDS: Readonly<Record<string, string>> = {
  district: "supervisor district",
  approval_year: "year of Planning approval",
  construction_status: "construction stage"
}

const groupWords = (key: string) => GROUP_WORDS[key] ?? key.replace(/_/g, " ")

const PROJECT_SOURCES: Readonly<Record<string, string>> = {
  development_pipeline: "Planning pipeline projects",
  affordable_pipeline: "MOHCD affordable pipeline projects"
}

export const developmentProjects = (p: {
  readonly status?: string
  readonly neighborhood?: string
  readonly supervisorDistrict?: number
  readonly minAffordableUnits?: number
  readonly inStatusSinceBefore?: string
  readonly approvedBefore?: string
}) =>
  phrase("Planning pipeline projects", [
    given(p.status, (s) => `with status ${s}`),
    given(p.neighborhood, (n) => `in ${n}`),
    given(p.supervisorDistrict, (d) => `in supervisor district ${String(d)}`),
    given(p.minAffordableUnits, (n) => `with at least ${String(n)} affordable units`),
    given(p.inStatusSinceBefore, (d) => `in their status since before ${d}`),
    given(p.approvedBefore, (d) => `approved by Planning before ${d}`)
  ])

export const developmentSummary = (p: {
  readonly groupBy: string
  readonly status?: string
  readonly affordableOnly?: boolean
}) =>
  phrase(`Planning pipeline projects and units by ${groupWords(p.groupBy)}`, [
    given(p.status, (s) => `with status ${s}`),
    p.affordableOnly === true ? "projects with affordable units only" : null
  ])

export const affordableProjects = (p: {
  readonly status?: string
  readonly neighborhood?: string
  readonly supervisorDistrict?: number
  readonly minUnits?: number
  readonly estimatedStartBefore?: string
}) =>
  phrase("MOHCD affordable pipeline projects", [
    given(p.status, (s) => `with status ${s}`),
    given(p.neighborhood, (n) => `in ${n}`),
    given(p.supervisorDistrict, (d) => `in supervisor district ${String(d)}`),
    given(p.minUnits, (n) => `with at least ${String(n)} units`),
    given(p.estimatedStartBefore, (d) => `with estimated construction start before ${d}`)
  ])

export const affordableSummary = (p: { readonly groupBy: string; readonly status?: string }) =>
  phrase(`MOHCD affordable pipeline projects and units by ${groupWords(p.groupBy)}`, [
    given(p.status, (s) => `with status ${s}`)
  ])

export const unitsByIncomeBand = (p: { readonly status?: string }) =>
  phrase("MOHCD affordable pipeline units by income band", [given(p.status, (s) => `with status ${s}`)])

export const hazardExposure = (p: { readonly projects: string; readonly affordableOnly?: boolean }, zoneName: string) =>
  phrase(`${PROJECT_SOURCES[p.projects] ?? p.projects} inside the ${zoneName}`, [
    p.affordableOnly === true ? "projects with affordable units only" : null
  ])

export const evictionCounts = (p: {
  readonly from: string
  readonly to: string
  readonly grounds?: ReadonlyArray<string>
  readonly neighborhood?: string
  readonly supervisorDistrict?: number
  readonly groupBy?: ReadonlyArray<string>
}) =>
  phrase(`Eviction notices filed from ${p.from} to ${p.to}`, [
    given(p.grounds, (g) => `giving any of the grounds ${g.join(", ")}`),
    given(p.neighborhood, (n) => `in ${n}`),
    given(p.supervisorDistrict, (d) => `in supervisor district ${String(d)}`),
    p.groupBy === undefined || p.groupBy.length === 0 ? null : `by ${p.groupBy.map(groupWords).join(" and ")}`
  ])

export const evictionGrounds = () => "Eviction notice grounds, with the reason and section the annual report gives each"

export const allowableRentIncrease = (p: { readonly on?: string; readonly fromYear?: number }) =>
  phrase(
    p.on === undefined
      ? "The latest annual allowable rent increase"
      : `The annual allowable rent increase in effect on ${p.on}`,
    [given(p.fromYear, (y) => `and each one since ${String(y)}`)]
  )

export const datasetInfo = () => "The dataset's description, license and version"
