import { describe, expect, it } from "@effect/vitest"
import { AiError, McpClientError, McpSchema } from "effect/ai"

import { errorType, structuredContent } from "../src/loop/ToolResults.ts"

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
