import { Effect, Option } from "effect"
import { AiError } from "effect/ai"

import type { McpTool, McpToolkit, ServerState } from "./McpConnections.ts"

/** One request's tools: every connected server's tools, merged, and the servers that were left out. */
export interface TurnTools {
  readonly toolkit: McpToolkit
  /** Servers with no connection, whose tools are not offered for this request. */
  readonly unavailable: ReadonlyArray<string>
  /** The server a prefixed tool name belongs to. */
  readonly serverOf: (toolName: string) => string | undefined
}

/**
 * Merges the connected servers' toolkits, routing each call to the server whose toolkit has the tool. Tool names do
 * not overlap, since the directory's prefixes are unique.
 */
export const turnTools = (states: ReadonlyArray<ServerState>): TurnTools => {
  const tools: Record<string, McpTool> = {}
  const owners = new Map<string, { readonly server: string; readonly toolkit: McpToolkit }>()
  const unavailable: Array<string> = []
  for (const { server, connection } of states) {
    if (Option.isNone(connection)) {
      unavailable.push(server.name)
      continue
    }
    const { toolkit } = connection.value
    for (const [name, tool] of Object.entries(toolkit.tools)) {
      tools[name] = tool
      owners.set(name, { server: server.name, toolkit })
    }
  }
  const toolkit: McpToolkit = {
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
        : owner.toolkit.handle(name, params, toolCallId, options)
    }
  }
  return { toolkit, unavailable, serverOf: (toolName) => owners.get(toolName)?.server }
}
