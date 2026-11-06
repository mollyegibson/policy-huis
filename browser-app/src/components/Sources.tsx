import { Link, Stack, Typography } from "@mui/material"

import type { Citation } from "@policyhuis/protocol/Citation"

import { groupSources, sourceNumbers } from "../questions/citations.ts"

interface SourcesProps {
  readonly answer: string
  readonly citations: ReadonlyMap<string, Citation>
}

/** What one citation used: a dataset query's tool and parameters, or a document's provision. */
const usedPart = (citation: Citation) =>
  citation._tag === "DatasetCitation"
    ? `${citation.tool} ${JSON.stringify(citation.parameters)}`
    : `${citation.documentTitle}, ${citation.provision}`

/** The sources cited in the answer, numbered to match its chips. */
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
        const title = first._tag === "DatasetCitation" ? first.title : first.documentTitle
        const version = first._tag === "DatasetCitation" ? first.sourceVersion : first.versionDate
        return (
          <Stack key={sourceId} id={`cite-${String(number)}`} spacing={0.5}>
            <Typography variant="subtitle2">
              {`${String(number)}. `}
              <Link href={first.sourceUrl} target="_blank" rel="noreferrer">
                {title}
              </Link>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[first.publisher, `version ${version}`].filter((part) => part !== null).join(" · ")}
              {" · the live link may show newer data"}
            </Typography>
            {cited.map((citation) => (
              <Typography key={citation.citationId} variant="caption" sx={{ fontFamily: "monospace", pl: 2 }}>
                {usedPart(citation)}
              </Typography>
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}
