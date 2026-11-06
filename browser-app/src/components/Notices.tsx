import { Alert, Stack } from "@mui/material"

import type { Notice } from "../questions/notices.ts"

/** Incomplete answers, unreachable servers, busy and offline states, and the logging note. */
export const Notices = ({ notices }: { readonly notices: ReadonlyArray<Notice> }) => (
  <Stack spacing={1}>
    {notices.map((notice) => (
      <Alert key={notice.text} severity={notice.severity}>
        {notice.text}
      </Alert>
    ))}
  </Stack>
)
