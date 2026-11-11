/**
 * `yarn dev`: starts the backend and the browser app, and the servers of each group named with `--include`, with
 * their logs interleaved. A group is a top-level directory other than `shared/` that holds a workspace with a
 * `start` script, such as `san-francisco`.
 *
 *     yarn dev
 *     yarn dev --include san-francisco
 *     yarn dev --include san-francisco netherlands
 *     yarn dev --all
 */
import { spawn } from "node:child_process"

import { requestedGroups, ROOT, startableGroups, usage, workspaceIncludes } from "./groups.ts"

const groups = startableGroups()
let selected: ReadonlyArray<string>
try {
  selected = requestedGroups(process.argv.slice(2), groups)
} catch (error) {
  console.error(`${String(error instanceof Error ? error.message : error)}\n${usage(groups)}`)
  process.exit(2)
}

const child = spawn(
  "yarn",
  ["workspaces", "foreach", "-A", "-p", "-i", ...workspaceIncludes(selected), "run", "start"],
  {
    cwd: ROOT,
    stdio: "inherit"
  }
)
child.on("exit", (code) => process.exit(code ?? 1))
