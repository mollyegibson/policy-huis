import { Duration, Effect, Exit, Option } from "effect"
import { AiError, McpClient } from "effect/ai"
import type { Toolkit } from "effect/ai"

import type { ServerState } from "./McpConnections.ts"

/** A tool from an MCP server, returning the full MCP result and returning failures to the model as results. */
export type McpTool = McpClient.RemoteTool<"complete", "return">

export type McpToolkit = Toolkit.WithHandler<Record<string, McpTool>>

/** One request's tools: every connected server's tools, merged, and the servers that were left out. */
export interface TurnTools {
  readonly toolkit: McpToolkit
  /** Servers with no connection, whose tools are not offered for this request. */
  readonly unavailable: ReadonlyArray<string>
  /** The server a prefixed tool name belongs to. */
  readonly serverOf: (toolName: string) => string | undefined
}

/** Merges toolkits whose tool names do not overlap (the directory's prefixes are unique), routing each call by name. */
export const mergeToolkits = (toolkits: ReadonlyArray<McpToolkit>): McpToolkit => {
  const tools: Record<string, McpTool> = {}
  const owners = new Map<string, McpToolkit>()
  for (const toolkit of toolkits) {
    for (const [name, tool] of Object.entries(toolkit.tools)) {
      tools[name] = tool
      owners.set(name, toolkit)
    }
  }
  return {
    tools,
    handle: (name, params, toolCallId, options) => {
      const owner = owners.get(name)
      return owner === undefined
        ? Effect.fail(
            AiError.make({
              module: "TurnToolkit",
              method: "handle",
              reason: new AiError.ToolNotFoundError({ toolName: name, availableTools: Object.keys(tools) })
            })
          )
        : owner.handle(name, params, toolCallId, options)
    }
  }
}

/** Builds one request's toolkit from the servers' current connections, using their cached tool lists. */
export const buildTurnTools = Effect.fn("TurnToolkit.build")(function* (
  states: ReadonlyArray<ServerState>,
  callTimeout: Duration.Duration
) {
  const unavailable: Array<string> = []
  const toolkits: Array<McpToolkit> = []
  const prefixes: Array<{ readonly prefix: string; readonly name: string }> = []
  for (const { server, connection } of states) {
    if (Option.isNone(connection)) {
      unavailable.push(server.name)
      continue
    }
    const exit = yield* Effect.exit(
      McpClient.toolkit(connection.value.client, {
        prefix: server.prefix,
        tools: connection.value.tools,
        resultMode: "complete",
        failureMode: "return",
        timeout: callTimeout
      })
    )
    if (Exit.isFailure(exit)) {
      yield* Effect.logWarning(`MCP server ${server.name} published tools that cannot be offered`, exit.cause)
      unavailable.push(server.name)
      continue
    }
    toolkits.push(exit.value)
    prefixes.push({ prefix: server.prefix, name: server.name })
  }
  const tools: TurnTools = {
    toolkit: mergeToolkits(toolkits),
    unavailable,
    serverOf: (toolName) => prefixes.find(({ prefix }) => toolName.startsWith(prefix))?.name
  }
  return tools
})
