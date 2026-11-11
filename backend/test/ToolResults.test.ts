import { describe, expect, it } from "@effect/vitest"
import { AiError, McpClientError, McpSchema } from "effect/ai"

import { errorType, failedOutcome, readCitations, structuredContent } from "../src/loop/ToolResults.ts"

const toolError = (text: string) =>
  new McpClientError.McpClientError({
    reason: new McpClientError.ToolError({
      result: new McpSchema.CallToolResult({ isError: true, content: [{ type: "text", text }] })
    })
  })

describe("errorType", () => {
  it("names the server's own error type for an error result", () => {
    expect(errorType(toolError(JSON.stringify({ _tag: "UnknownValue", field: "neighborhood" })))).toBe("UnknownValue")
    expect(errorType(toolError("not JSON"))).toBe("ToolError")
  })

  it("names only the reason of a transport error, never its cause", () => {
    const transport = new McpClientError.McpClientError({
      reason: new McpClientError.TransportError({
        description: "MCP HTTP request failed",
        cause: new Error("connect ECONNREFUSED 100.64.0.7:8081")
      })
    })
    expect(errorType(transport)).toBe("TransportError")
  })

  it("names a toolkit error's reason", () => {
    const invalid = AiError.make({
      module: "Toolkit",
      method: "lookup.handle",
      reason: new AiError.ToolParameterValidationError({ toolName: "lookup", description: "Expected string" })
    })
    expect(errorType(invalid)).toBe("ToolParameterValidationError")
  })
})

describe("structuredContent", () => {
  it("is null for a result without structuredContent", () => {
    expect(structuredContent({ content: [] })).toBeNull()
    expect(structuredContent({ structuredContent: { a: 1 } })).toEqual({ a: 1 })
  })
})

describe("failedOutcome", () => {
  it("counts a server or its database out of reach as unavailable, and anything else as failed", () => {
    expect(["TransportError", "ClosedError", "DatabaseUnavailable"].map(failedOutcome)).toEqual([
      "unavailable",
      "unavailable",
      "unavailable"
    ])
    expect(["UnknownValue", "DataUnavailable", "ToolParameterValidationError"].map(failedOutcome)).toEqual([
      "failed",
      "failed",
      "failed"
    ])
  })
})

describe("readCitations", () => {
  const citation = {
    citationId: "sf_data.development_pipeline@2026-08-28#3f9a1c0e7b2d4a6f",
    sourceId: "sf_data.development_pipeline@2026-08-28",
    title: "SF Development Pipeline",
    publisher: "San Francisco Planning",
    sourceUrl: "https://data.sf.gov/d/6jgi-cpb4",
    version: "2026-08-28",
    locator: "Planning pipeline projects, with status BP Filed",
    quote: null
  }

  it("reads citations that follow the convention, ignoring a server's own extra fields", () => {
    const read = readCitations({ citations: [{ ...citation, documentType: "law" }] })
    expect(read).toEqual({ citations: [citation], rejected: 0, missing: false })
  })

  it("fills left-out optional fields with null", () => {
    const required = {
      citationId: citation.citationId,
      sourceId: citation.sourceId,
      title: citation.title,
      sourceUrl: citation.sourceUrl,
      version: citation.version
    }
    const [read] = readCitations({ citations: [required] }).citations
    expect([read?.publisher, read?.locator, read?.quote]).toEqual([null, null, null])
  })

  it("rejects each citation that breaks the convention, keeping the rest", () => {
    const read = readCitations({
      citations: [citation, { ...citation, sourceId: "development_pipeline@2026-08-28" }, { title: "no IDs" }]
    })
    expect([read.citations.length, read.rejected, read.missing]).toEqual([1, 2, false])
  })

  it("reports a result with no citations list", () => {
    expect(readCitations({ value: 1 })).toEqual({ citations: [], rejected: 0, missing: true })
    expect(readCitations(null)).toEqual({ citations: [], rejected: 0, missing: true })
  })
})
