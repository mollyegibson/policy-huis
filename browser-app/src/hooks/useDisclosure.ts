import { useCallback, useState } from "react"

/** Whether a collapsible section is open, and how to toggle it. */
export const useDisclosure = (initiallyOpen = false) => {
  const [open, setOpen] = useState(initiallyOpen)
  const toggle = useCallback(() => {
    setOpen((current) => !current)
  }, [])
  return { open, toggle }
}
