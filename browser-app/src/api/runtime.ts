import { Atom } from "effect/reactivity"

import { ApiClient } from "./ApiClient.ts"

/** The atom runtime every atom that calls the backend runs in. */
export const apiRuntime = Atom.runtime(ApiClient.layer)
