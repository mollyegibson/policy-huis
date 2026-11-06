import { useCallback, useState } from "react"

/** The longest question the backend accepts, from `QuestionRequest`. */
export const MAX_QUESTION_LENGTH = 2000

/** The question being typed, and whether it can be sent: not blank, and within the backend's limit. */
export const useQuestionDraft = () => {
  const [draft, setDraft] = useState("")
  const question = draft.trim()
  const valid = question.length > 0 && question.length <= MAX_QUESTION_LENGTH
  const change = useCallback((value: string) => {
    setDraft(value)
  }, [])
  return { draft, question, valid, change }
}
