/** How the loop ended a question. */
export const OUTCOMES = ["answered", "step_limit", "context_limit", "truncated", "failed"] as const
export type Outcome = (typeof OUTCOMES)[number]

/** How one tool call ended. */
export const TOOL_OUTCOMES = ["success", "failure"] as const
export type ToolOutcome = (typeof TOOL_OUTCOMES)[number]
