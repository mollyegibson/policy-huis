import { Box, Chip, CircularProgress, Collapse, Stack, Typography } from "@mui/material"

import { useDisclosure } from "../hooks/useDisclosure.ts"
import type { ToolCallStatus, ToolCallView } from "../questions/QuestionState.ts"
import { toolLabel } from "../questions/toolLabels.ts"

const STATUS_CHIP: Record<
  Exclude<ToolCallStatus, "running">,
  { label: string; color: "success" | "error" | "default" }
> = {
  done: { label: "done", color: "success" },
  failed: { label: "failed", color: "error" },
  unfinished: { label: "did not finish", color: "default" }
}

/** Formatted JSON in a scrolling block with a fixed maximum height. */
const JsonBlock = ({ value }: { readonly value: unknown }) => (
  <Box
    component="pre"
    sx={{
      m: 0,
      p: 1,
      maxHeight: 240,
      overflow: "auto",
      bgcolor: "action.hover",
      borderRadius: 1,
      fontFamily: "monospace",
      fontSize: "0.75rem",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere"
    }}
  >
    {JSON.stringify(value, null, 2)}
  </Box>
)

/** One tool call: its label and status, expanding to its name, arguments and result or error type. */
export const ToolCallRow = ({ call }: { readonly call: ToolCallView }) => {
  const { open, toggle } = useDisclosure()
  const { tag, name } = toolLabel(call.tool, call.server)
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        onClick={toggle}
        sx={{ alignItems: "center", cursor: "pointer" }}
        role="button"
        aria-expanded={open}
      >
        {tag !== null && <Chip size="small" variant="outlined" label={tag} />}
        <Typography variant="body2">{name}</Typography>
        {call.status === "running" ? (
          <CircularProgress size={14} />
        ) : (
          <Chip size="small" label={STATUS_CHIP[call.status].label} color={STATUS_CHIP[call.status].color} />
        )}
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Stack spacing={1} sx={{ pl: 2, pt: 1 }}>
          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
            {call.tool}
          </Typography>
          <Typography variant="caption">Arguments</Typography>
          <JsonBlock value={call.arguments} />
          {call.status === "done" && (
            <>
              <Typography variant="caption">Result</Typography>
              <JsonBlock value={call.result} />
            </>
          )}
          {call.status === "failed" && <Typography variant="caption">Error: {call.error ?? "unknown"}</Typography>}
        </Stack>
      </Collapse>
    </Box>
  )
}
