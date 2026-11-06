import { Button, Stack, TextField } from "@mui/material"
import type { SubmitEvent } from "react"

import { MAX_QUESTION_LENGTH, useQuestionDraft } from "../questions/useQuestionDraft.ts"

interface QuestionFormProps {
  readonly streaming: boolean
  readonly onAsk: (question: string) => void
  readonly onStop: () => void
}

/** The question box, with Ask, which becomes Stop while an answer streams. */
export const QuestionForm = ({ streaming, onAsk, onStop }: QuestionFormProps) => {
  const { draft, question, valid, change } = useQuestionDraft()

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (streaming) onStop()
    else if (valid) onAsk(question)
  }

  return (
    <Stack component="form" spacing={1} onSubmit={submit}>
      <TextField
        label="Ask about housing policy"
        multiline
        minRows={2}
        value={draft}
        onChange={(event) => {
          change(event.target.value)
        }}
        error={question.length > MAX_QUESTION_LENGTH}
        helperText={`${String(question.length)} / ${String(MAX_QUESTION_LENGTH)}`}
      />
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button
          type="submit"
          variant="contained"
          color={streaming ? "inherit" : "primary"}
          disabled={!streaming && !valid}
        >
          {streaming ? "Stop" : "Ask"}
        </Button>
      </Stack>
    </Stack>
  )
}
