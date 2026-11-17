import { Toolkit } from "effect/ai"

/**
 * The server's tools. Each is added as the data it reads is modelled, with its input and output schemas, its
 * description, its citations and its locator, following the San Francisco server's patterns.
 */
export const makeAmsDataToolkit = () => Toolkit.make()

export type AmsDataToolkit = ReturnType<typeof makeAmsDataToolkit>
