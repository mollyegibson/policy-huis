import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import { Layer } from "effect"

import { ServerLive } from "./Server.ts"

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
