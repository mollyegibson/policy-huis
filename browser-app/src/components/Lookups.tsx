import { Button, Collapse, Stack } from "@mui/material"

import { useDisclosure } from "../hooks/useDisclosure.ts"
import type { LookupView } from "../questions/QuestionState.ts"
import { LookupRow } from "./LookupRow.tsx"

interface LookupsProps {
  readonly lookups: ReadonlyArray<LookupView>
  /** Whether `Complete` has arrived; the rows then collapse under "Made N lookups", so the answer leads. */
  readonly finished: boolean
}

const Rows = ({ lookups }: { readonly lookups: ReadonlyArray<LookupView> }) => (
  <Stack spacing={1}>
    {lookups.map((lookup) => (
      <LookupRow key={lookup.lookupId} lookup={lookup} />
    ))}
  </Stack>
)

/** The agent's lookups: a live list while it works, then a "Made N lookups" toggle. */
export const Lookups = ({ lookups, finished }: LookupsProps) => {
  const { open, toggle } = useDisclosure()
  if (lookups.length === 0) return null
  if (!finished) return <Rows lookups={lookups} />
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      <Button size="small" color="inherit" onClick={toggle} aria-expanded={open}>
        {`Made ${String(lookups.length)} ${lookups.length === 1 ? "lookup" : "lookups"}`}
      </Button>
      <Collapse in={open} unmountOnExit sx={{ width: "100%" }}>
        <Rows lookups={lookups} />
      </Collapse>
    </Stack>
  )
}
