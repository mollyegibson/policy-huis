import { useAtomValue } from "@effect/atom-react"
import { Option } from "effect"
import { AsyncResult } from "effect/reactivity"
import { useCallback, useState } from "react"

import { chosenModel } from "./models.ts"
import { modelsAtom } from "./modelsAtom.ts"

const STORAGE_KEY = "policyhuis.model"

/** The stored choice, or null when there is none or the browser blocks storage. */
const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * The offered model configurations and the viewer's choice among them, remembered in this browser. Until the list
 * arrives, or when it cannot be fetched, `model` is null and a question goes to the backend's default.
 */
export const useModelChoice = () => {
  const result = useAtomValue(modelsAtom)
  const [stored, setStored] = useState(readStored)
  const offered = Option.getOrNull(AsyncResult.value(result))
  const model = offered === null ? null : chosenModel(offered, stored)
  const choose = useCallback((configuration: string) => {
    setStored(configuration)
    try {
      window.localStorage.setItem(STORAGE_KEY, configuration)
    } catch {
      // Storage is blocked, so the choice lasts until the page reloads.
    }
  }, [])
  return { offered, model, choose, unavailable: AsyncResult.isFailure(result) }
}
