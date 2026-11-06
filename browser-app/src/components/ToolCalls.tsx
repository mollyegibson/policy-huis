import { Button, Collapse, Stack } from "@mui/material"

import { useDisclosure } from "../hooks/useDisclosure.ts"
import type { ToolCallView } from "../questions/QuestionState.ts"
import { ToolCallRow } from "./ToolCallRow.tsx"

interface ToolCallsProps {
  readonly toolCalls: ReadonlyArray<ToolCallView>
  /** Whether `Complete` has arrived; the rows then collapse under "Used N tools", so the answer leads. */
  readonly finished: boolean
}

const Rows = ({ toolCalls }: { readonly toolCalls: ReadonlyArray<ToolCallView> }) => (
  <Stack spacing={1}>
    {toolCalls.map((call) => (
      <ToolCallRow key={call.callId} call={call} />
    ))}
  </Stack>
)

/** The agent's tool calls: a live list while it works, then a "Used N tools" toggle. */
export const ToolCalls = ({ toolCalls, finished }: ToolCallsProps) => {
  const { open, toggle } = useDisclosure()
  if (toolCalls.length === 0) return null
  if (!finished) return <Rows toolCalls={toolCalls} />
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      <Button size="small" color="inherit" onClick={toggle} aria-expanded={open}>
        {`Used ${String(toolCalls.length)} ${toolCalls.length === 1 ? "tool" : "tools"}`}
      </Button>
      <Collapse in={open} unmountOnExit sx={{ width: "100%" }}>
        <Rows toolCalls={toolCalls} />
      </Collapse>
    </Stack>
  )
}
