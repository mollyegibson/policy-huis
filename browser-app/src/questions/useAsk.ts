import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useCallback, useMemo } from "react"
import { Atom } from "effect/reactivity"

import { askAtom } from "./askAtom.ts"
import { questionView } from "./notices.ts"

/** The current question for components: what to show, and how to ask or stop. */
export const useAsk = () => {
  const result = useAtomValue(askAtom)
  const write = useAtomSet(askAtom)
  const view = useMemo(() => questionView(result), [result])
  const ask = useCallback(
    (question: string, model: string | null) => {
      write({ question, model })
    },
    [write]
  )
  const stop = useCallback(() => {
    write(Atom.Interrupt)
  }, [write])
  return { ...view, ask, stop }
}
