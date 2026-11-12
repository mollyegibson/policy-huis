import { Schema } from "effect"

import { Citation } from "@policyhuis/protocol/Citation"

import type { Answer, Lookup } from "../src/Answer.ts"

/** A citation of one passage of a docs server document, as the backend sends it in `Sources`. */
export const docsCitation = (documentId: string, version: string, provision: string): Citation =>
  Schema.decodeUnknownSync(Citation)({
    citationId: `sf_docs.${documentId}@${version}#${provision}`,
    sourceId: `sf_docs.${documentId}@${version}`,
    title: documentId,
    publisher: null,
    sourceUrl: "https://example.org/document.pdf",
    version,
    locator: `Sec. ${provision}`,
    quote: null
  })

export const ordinance = (provision: string) => docsCitation("rent_ordinance", "2026-06-29", provision)

export const lookup = (tool: string, args: unknown, result: unknown = null): Lookup => ({
  tool,
  arguments: args,
  outcome: "succeeded",
  result,
  error: null
})

/** An answered question with `text`, and the lookups and citations given. */
export const answer = (
  text: string,
  options: { readonly lookups?: ReadonlyArray<Lookup>; readonly citations?: ReadonlyArray<Citation> } = {}
): Answer => ({
  requestId: "6f1c3c9e-2b8a-4b55-9d84-0f6a8c1d2e3f",
  outcome: "answered",
  message: null,
  unavailableServers: [],
  model: { configuration: "local", modelId: "gpt-oss:20b" },
  usage: { inputTokens: 1000, outputTokens: 100 },
  text,
  lookups: options.lookups ?? [],
  citations: options.citations ?? []
})
