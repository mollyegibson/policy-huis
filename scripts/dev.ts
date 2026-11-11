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
import { execFileSync, spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { Schema } from "effect"

const ROOT = join(import.meta.dirname, "..")
const CORE = ["backend", "browser-app"]
const LIBRARIES = "shared"

const WorkspaceLine = Schema.fromJsonString(Schema.Struct({ location: Schema.String, name: Schema.String }))
const Manifest = Schema.Struct({ scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)) })

const usage = (groups: ReadonlyArray<string>) =>
  `Usage: yarn dev [--include <group>...] [--all]\nGroups: ${groups.length === 0 ? "none" : groups.join(", ")}`

/** Top-level directories, other than `shared/`, holding at least one workspace with a `start` script. */
const startableGroups = (): ReadonlyArray<string> => {
  const lines = execFileSync("yarn", ["workspaces", "list", "--json"], { cwd: ROOT, encoding: "utf8" })
  const groups = new Set<string>()
  for (const line of lines.trim().split("\n")) {
    const { location } = Schema.decodeUnknownSync(WorkspaceLine)(line)
    const [group, ...rest] = location.split("/")
    if (group === undefined || rest.length === 0 || group === LIBRARIES) continue
    const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
      readFileSync(join(ROOT, location, "package.json"), "utf8")
    )
    if (manifest.scripts?.["start"] !== undefined) groups.add(group)
  }
  return [...groups].sort()
}

/** The groups the arguments name: the values after `--include`, or every group with `--all`. */
const requestedGroups = (args: ReadonlyArray<string>, groups: ReadonlyArray<string>): ReadonlyArray<string> => {
  const requested: Array<string> = []
  let including = false
  for (const arg of args) {
    if (arg === "--all") {
      requested.push(...groups)
      including = false
    } else if (arg === "--include") {
      including = true
    } else if (including && !arg.startsWith("-")) {
      requested.push(arg)
    } else {
      throw new Error(`Unexpected argument ${arg}`)
    }
  }
  const unknown = requested.filter((g) => !groups.includes(g))
  if (unknown.length > 0) throw new Error(`Unknown group ${unknown.join(", ")}`)
  return [...new Set(requested)]
}

const groups = startableGroups()
let selected: ReadonlyArray<string>
try {
  selected = requestedGroups(process.argv.slice(2), groups)
} catch (error) {
  console.error(`${String(error instanceof Error ? error.message : error)}\n${usage(groups)}`)
  process.exit(2)
}

const includes = [...CORE, ...selected.map((g) => `${g}/*`)].flatMap((pattern) => ["--include", pattern])
const child = spawn("yarn", ["workspaces", "foreach", "-A", "-p", "-i", ...includes, "run", "start"], {
  cwd: ROOT,
  stdio: "inherit"
})
child.on("exit", (code) => process.exit(code ?? 1))
