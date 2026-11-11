import { Context, Effect, Option } from "effect"
import { AiError, Tool } from "effect/ai"

import type { ToolOwner } from "../loop/AgentLoop.ts"
import type { McpTool, McpToolkit, ServerState } from "./McpConnections.ts"

/** One request's tools: every connected server's tools, merged, and the servers that were left out. */
export interface TurnTools {
  readonly toolkit: McpToolkit
  /** Servers with no connection, whose tools are not offered for this request. */
  readonly unavailable: ReadonlyArray<string>
  /** The server a prefixed tool name belongs to, with its label and the tool's title; null if none offers it. */
  readonly serverOf: (toolName: string) => ToolOwner | null
  /** Tool names more than one connected server offers, with those servers; such a tool is offered by none. */
  readonly collisions: ReadonlyArray<{ readonly tool: string; readonly servers: ReadonlyArray<string> }>
}

/**
 * A tool's title as its server publishes it (`annotations.title`, which the client copies into `Tool.Title`), or, for
 * a server that publishes none, the tool's own name in words.
 */
const titleOf = (tool: McpTool, ownName: string): string =>
  Option.getOrElse(Context.getOption(tool.annotations, Tool.Title), () => {
    const words = ownName.replace(/_/g, " ")
    return words.charAt(0).toUpperCase() + words.slice(1)
  })

/**
 * Merges the connected servers' toolkits, routing each call to the server whose toolkit has the tool. Unique prefixes
 * do not guarantee unique names when one prefix starts another (`sf_` with a tool `docs_search` and `sf_docs_` with
 * a tool `search`), so a name offered by two servers is routed to neither and listed in `collisions`.
 */
export const turnTools = (states: ReadonlyArray<ServerState>): TurnTools => {
  const unavailable: Array<string> = []
  const offers = new Map<
    string,
    Array<{ readonly server: ToolOwner; readonly toolkit: McpToolkit; readonly tool: McpTool }>
  >()
  for (const { server, connection } of states) {
    if (Option.isNone(connection)) {
      unavailable.push(server.name)
      continue
    }
    const { toolkit } = connection.value
    for (const [name, tool] of Object.entries(toolkit.tools)) {
      const owner: ToolOwner = {
        name: server.name,
        label: server.label,
        title: titleOf(tool, name.slice(server.prefix.length))
      }
      offers.set(name, [...(offers.get(name) ?? []), { server: owner, toolkit, tool }])
    }
  }
  const tools: Record<string, McpTool> = {}
  const owners = new Map<string, { readonly server: ToolOwner; readonly toolkit: McpToolkit }>()
  const collisions: Array<{ readonly tool: string; readonly servers: ReadonlyArray<string> }> = []
  for (const [name, offered] of offers) {
    const [only, ...others] = offered
    if (only === undefined) continue
    if (others.length > 0) {
      collisions.push({ tool: name, servers: offered.map((o) => o.server.name) })
      continue
    }
    tools[name] = only.tool
    owners.set(name, { server: only.server, toolkit: only.toolkit })
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
  return {
    toolkit,
    unavailable,
    serverOf: (toolName) => owners.get(toolName)?.server ?? null,
    collisions
  }
}
