import { Link, Stack, Typography } from "@mui/material"

import type { Citation } from "@policyhuis/protocol/Citation"

import { groupSources, sourceNumbers } from "../questions/citations.ts"

interface SourcesProps {
  readonly answer: string
  readonly citations: ReadonlyMap<string, Citation>
}

/** The sources cited in the answer, numbered to match its chips, each with the parts the answer used. */
export const Sources = ({ answer, citations }: SourcesProps) => {
  const groups = groupSources(citations, sourceNumbers(answer, citations))
  if (groups.length === 0) return null
  return (
    <Stack spacing={2}>
      <Typography variant="h6" component="h2">
        Sources
      </Typography>
      {groups.map(({ number, sourceId, citations: cited }) => {
        const [first] = cited
        if (first === undefined) return null
        return (
          <Stack key={sourceId} id={`cite-${String(number)}`} spacing={0.5}>
            <Typography variant="subtitle2">
              {`${String(number)}. `}
              <Link href={first.sourceUrl} target="_blank" rel="noreferrer">
                {first.title}
              </Link>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[first.publisher, `version ${first.version}`].filter((part) => part !== null).join(" · ")}
              {" · the live link may show newer data"}
            </Typography>
            {cited.map((citation) => (
              <Stack key={citation.citationId} spacing={0.25} sx={{ pl: 2 }}>
                {citation.locator !== null && <Typography variant="caption">{citation.locator}</Typography>}
                {citation.quote !== null && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {`“${citation.quote}”`}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}
