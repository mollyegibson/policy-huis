import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { Schema } from "effect"

export const ROOT = join(import.meta.dirname, "..")
const CORE = ["backend", "browser-app"]
const LIBRARIES = "shared"

const WorkspaceLine = Schema.fromJsonString(Schema.Struct({ location: Schema.String, name: Schema.String }))
const Manifest = Schema.Struct({ scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)) })

export const usage = (groups: ReadonlyArray<string>) =>
  `Usage: yarn dev [--include <group>...] [--all]\nGroups: ${groups.length === 0 ? "none" : groups.join(", ")}`

/** Top-level directories, other than `shared/`, holding at least one workspace with a `start` script. */
export const startableGroups = (): ReadonlyArray<string> => {
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
export const requestedGroups = (args: ReadonlyArray<string>, groups: ReadonlyArray<string>): ReadonlyArray<string> => {
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

/**
 * The `--include` arguments for `yarn workspaces foreach` that select the backend, the browser app and every workspace
 * at any depth under each selected group. Yarn matches them against workspace paths, where `*` does not cross `/`.
 */
export const workspaceIncludes = (selected: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...CORE, ...selected.map((g) => `${g}/**`)].flatMap((pattern) => ["--include", pattern])
