import type { AmsDataToolkit } from "./Tools.ts"

/** The handlers of `toolkit`, whichever tools it offers; a tool's handler is found by its name. */
export const AmsDataHandlers = (toolkit: AmsDataToolkit) => toolkit.toLayer({})
