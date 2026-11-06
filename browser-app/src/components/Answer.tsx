import { Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from "@mui/material"
import type { AnchorHTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react"
import Markdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import type { Citation } from "@policyhuis/protocol/Citation"

import { linkCitations, MISSING_CITATION, sourceNumbers } from "../questions/citations.ts"

interface AnswerProps {
  readonly answer: string
  readonly citations: ReadonlyMap<string, Citation>
}

/** A citation chip, smaller than MUI's small chip so it sits within a line of text. */
const CHIP_SX = {
  height: 18,
  mx: 0.25,
  fontSize: "0.7rem",
  verticalAlign: "text-bottom",
  "& .MuiChip-label": { px: 0.75 }
} as const

/** Renders a citation marker's link as a numbered chip that scrolls to its source; any other link opens normally. */
const AnswerLink = ({ href, title, children }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  if (href === MISSING_CITATION) {
    return (
      <Tooltip title={`No source was received for ${title ?? "this citation"}`}>
        <Chip size="small" label="?" variant="outlined" sx={{ ...CHIP_SX, color: "text.disabled" }} />
      </Tooltip>
    )
  }
  if (href?.startsWith("#cite-") === true) {
    return <Chip size="small" label={children} component="a" href={href} clickable color="primary" sx={CHIP_SX} />
  }
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** A Markdown table cell's alignment, which GFM sets from the table's `:---:` row as a `text-align` style. */
const cellAlign = (style: TdHTMLAttributes<HTMLTableCellElement>["style"]) => {
  const align = style?.textAlign
  return align === "left" || align === "center" || align === "right" ? align : undefined
}

/** Markdown tables, which the model writes for breakdowns, as MUI tables; links as citation chips. */
const components: Components = {
  a: AnswerLink,
  table: ({ children }: { readonly children?: ReactNode }) => (
    <TableContainer sx={{ my: 2, overflowX: "auto" }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }: { readonly children?: ReactNode }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }: { readonly children?: ReactNode }) => <TableBody>{children}</TableBody>,
  tr: ({ children }: { readonly children?: ReactNode }) => <TableRow>{children}</TableRow>,
  th: ({ children, style }: ThHTMLAttributes<HTMLTableCellElement>) => (
    <TableCell align={cellAlign(style)} sx={{ fontWeight: "bold" }}>
      {children}
    </TableCell>
  ),
  td: ({ children, style }: TdHTMLAttributes<HTMLTableCellElement>) => (
    <TableCell align={cellAlign(style)}>{children}</TableCell>
  )
}

/**
 * The answer as Markdown, including GitHub-style tables, with citation markers turned into chips before parsing.
 */
export const Answer = ({ answer, citations }: AnswerProps) => {
  if (answer === "") return null
  const linked = linkCitations(answer, citations, sourceNumbers(answer, citations))
  return (
    <Box sx={{ "& p:first-of-type": { mt: 0 } }}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {linked}
      </Markdown>
    </Box>
  )
}
