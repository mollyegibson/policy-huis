/**
 * A citation's `locator`: what part of a dataset a result used, in words a reader can check against the source.
 * Each tool builds its locator from its parameters only, so the same query always has the same locator.
 */
export const phrase = (subject: string, filters: ReadonlyArray<string | null>): string =>
  [subject, ...filters.filter((f): f is string => f !== null)].join(", ")
