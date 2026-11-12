import { Container, Stack, Typography } from "@mui/material"

import { Answer } from "./components/Answer.tsx"
import { Lookups } from "./components/Lookups.tsx"
import { ModelChoice } from "./components/ModelChoice.tsx"
import { Notices } from "./components/Notices.tsx"
import { QuestionForm } from "./components/QuestionForm.tsx"
import { Sources } from "./components/Sources.tsx"
import { answeredBy } from "./models/models.ts"
import { useModelChoice } from "./models/useModelChoice.ts"
import { useAsk } from "./questions/useAsk.ts"

export const App = () => {
  const { state, streaming, notices, ask, stop } = useAsk()
  const { offered, model, choose, unavailable } = useModelChoice()
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          PolicyHuis
        </Typography>
        <QuestionForm
          streaming={streaming}
          onAsk={(question) => {
            ask(question, model)
          }}
          onStop={stop}
          beside={
            <ModelChoice
              offered={offered}
              model={model}
              unavailable={unavailable}
              disabled={streaming}
              onChoose={choose}
            />
          }
        />
        {state !== null && <Lookups lookups={state.lookups} finished={state.complete !== null} />}
        {state !== null && <Answer answer={state.answer} citations={state.citations} />}
        {state?.complete != null && (
          <Typography variant="caption" color="text.secondary">
            {answeredBy(offered, state.complete.model)}
          </Typography>
        )}
        {state !== null && <Sources answer={state.answer} citations={state.citations} />}
        <Notices notices={notices} />
      </Stack>
    </Container>
  )
}
