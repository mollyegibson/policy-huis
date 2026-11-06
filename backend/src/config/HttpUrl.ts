import { Schema } from "effect"

/** An absolute http or https URL. */
export const HttpUrl = Schema.NonEmptyString.pipe(
  Schema.check(
    Schema.makeFilter((url: string) =>
      URL.canParse(url) && /^https?:$/.test(new URL(url).protocol) ? true : "Expected an http or https URL"
    )
  )
)
