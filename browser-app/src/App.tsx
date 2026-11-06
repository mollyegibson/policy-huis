import { Container, Stack, Typography } from "@mui/material"

import { Answer } from "./components/Answer.tsx"
import { Notices } from "./components/Notices.tsx"
import { QuestionForm } from "./components/QuestionForm.tsx"
import { Sources } from "./components/Sources.tsx"
import { ToolCalls } from "./components/ToolCalls.tsx"
import { useAsk } from "./questions/useAsk.ts"

export const App = () => {
  const { state, streaming, notices, ask, stop } = useAsk()
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          PolicyHuis
        </Typography>
        <QuestionForm streaming={streaming} onAsk={ask} onStop={stop} />
        {state !== null && <ToolCalls toolCalls={state.toolCalls} finished={state.complete !== null} />}
        {state !== null && <Answer answer={state.answer} citations={state.citations} />}
        {state !== null && <Sources answer={state.answer} citations={state.citations} />}
        <Notices notices={notices} />
      </Stack>
    </Container>
  )
}
