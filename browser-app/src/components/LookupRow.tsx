import { Box, Chip, CircularProgress, Collapse, Stack, Typography } from "@mui/material"

import { useDisclosure } from "../hooks/useDisclosure.ts"
import type { LookupStatus, LookupView } from "../questions/QuestionState.ts"

const STATUS_CHIP: Record<
  Exclude<LookupStatus, "running">,
  { label: string; color: "success" | "error" | "warning" | "default" }
> = {
  succeeded: { label: "done", color: "success" },
  failed: { label: "failed", color: "error" },
  unavailable: { label: "unavailable", color: "warning" },
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

/** One lookup: its source, title and status, expanding to its tool, arguments and result or error type. */
export const LookupRow = ({ lookup }: { readonly lookup: LookupView }) => {
  const { open, toggle } = useDisclosure()
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
        {lookup.source !== null && <Chip size="small" variant="outlined" label={lookup.source.label} />}
        <Typography variant="body2">{lookup.title}</Typography>
        {lookup.status === "running" ? (
          <CircularProgress size={14} />
        ) : (
          <Chip size="small" label={STATUS_CHIP[lookup.status].label} color={STATUS_CHIP[lookup.status].color} />
        )}
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Stack spacing={1} sx={{ pl: 2, pt: 1 }}>
          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
            {lookup.tool}
          </Typography>
          <Typography variant="caption">Arguments</Typography>
          <JsonBlock value={lookup.arguments} />
          {lookup.status === "succeeded" && (
            <>
              <Typography variant="caption">Result</Typography>
              <JsonBlock value={lookup.result} />
            </>
          )}
          {(lookup.status === "failed" || lookup.status === "unavailable") && (
            <Typography variant="caption">Error: {lookup.error ?? "unknown"}</Typography>
          )}
        </Stack>
      </Collapse>
    </Box>
  )
}
