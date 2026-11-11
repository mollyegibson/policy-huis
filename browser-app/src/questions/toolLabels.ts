import type { ToolServer } from "@policyhuis/protocol/QuestionsApi"

/** A tool's label: its server's label as a tag, and the tool's name on that server in words. */
export interface ToolLabel {
  readonly tag: string | null
  readonly name: string
}

/**
 * Labels a tool call from the server the backend says it went to: { tag: "SF Housing", name: "Development pipeline
 * summary" } for `development_pipeline_summary` on `sf-housing`. A call no server offered has no tag, and its name is
 * the name the model called.
 */
export const toolLabel = (tool: string, server: ToolServer | null): ToolLabel => {
  const words = (server?.tool ?? tool).replace(/_/g, " ")
  return {
    tag: server?.label ?? null,
    name: words.charAt(0).toUpperCase() + words.slice(1)
  }
}
