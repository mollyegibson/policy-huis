/** A tool's label: the server's prefix as a tag, and the rest of its name in words. */
export interface ToolLabel {
  readonly tag: string | null
  readonly name: string
}

/**
 * Splits off the server prefix the backend adds (lowercase letters and digits, then an underscore, as in the server
 * directory) and turns the rest into words: "sf_development_pipeline_summary" → { tag: "SF", name: "Development
 * pipeline summary" }. A name without a prefix has no tag.
 */
export const toolLabel = (tool: string): ToolLabel => {
  const match = /^([a-z][a-z0-9]*)_(.+)$/.exec(tool)
  const prefix = match?.[1]
  const rest = match?.[2]
  const words = (rest ?? tool).replace(/_/g, " ")
  return {
    tag: prefix === undefined ? null : prefix.toUpperCase(),
    name: words.charAt(0).toUpperCase() + words.slice(1)
  }
}
