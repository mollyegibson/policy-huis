import { fileURLToPath } from "node:url"

import { dotEnv } from "@policyhuis/node-config"

/** `backend/.env`: the `app` database URL and each cloud model configuration's API key. */
export const BackendEnv = dotEnv(fileURLToPath(new URL("../../.env", import.meta.url)))
