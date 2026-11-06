import { Schema } from "effect"

import { AgentStreamEvent } from "@policyhuis/protocol/QuestionsApi"

/** Decodes events as the browser receives them, so a fixture the protocol no longer accepts fails its test. */
export const events = (encoded: ReadonlyArray<unknown>): ReadonlyArray<AgentStreamEvent> =>
  encoded.map((event) => Schema.decodeUnknownSync(AgentStreamEvent)(event))

export const CALL_A = "0b6f5c1e-3c2a-4d8e-9f1a-2b3c4d5e6f70"
export const CALL_B = "1c7a6d2f-4d3b-4e9f-8a2b-3c4d5e6f7a81"

/** A dataset citation whose IDs follow the protocol's rule: `<datasetKey>@<sourceVersion>#<queryKey>`. */
export const datasetCitation = (queryKey: string) => ({
  _tag: "DatasetCitation",
  sourceId: "sf.development_pipeline@2026-08-28",
  citationId: `sf.development_pipeline@2026-08-28#${queryKey}`,
  datasetKey: "sf.development_pipeline",
  title: "SF Development Pipeline",
  publisher: "San Francisco Planning",
  sourceUrl: "https://data.sf.gov/d/6jgi-cpb4",
  sourceVersion: "2026-08-28",
  tool: "development_pipeline_summary",
  parameters: { groupBy: "status" },
  queryKey
})

export const QUERY_1 = "3f9a1c0e7b2d4a6f"
export const QUERY_2 = "0123456789abcdef"

export const toolStart = (callId: string, tool = "sf_development_pipeline_summary") => ({
  _tag: "ToolStart",
  callId,
  tool,
  arguments: { groupBy: "status" }
})

export const toolSuccess = (callId: string, result: unknown, tool = "sf_development_pipeline_summary") => ({
  _tag: "ToolEnd",
  callId,
  tool,
  outcome: "success",
  result,
  error: null
})

export const toolFailure = (callId: string, error: string, tool = "sf_development_pipeline_summary") => ({
  _tag: "ToolEnd",
  callId,
  tool,
  outcome: "failure",
  result: null,
  error
})

export const text = (value: string) => ({ _tag: "TextChunk", text: value })

export const complete = (
  outcome: string,
  message: string | null = null,
  unavailableServers: ReadonlyArray<string> = []
) => ({
  _tag: "Complete",
  requestId: "00000000-0000-4000-8000-000000000001",
  outcome,
  message,
  unavailableServers
})
