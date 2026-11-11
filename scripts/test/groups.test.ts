import { execFileSync } from "node:child_process"
import { relative } from "node:path"

import { describe, expect, it } from "vitest"

import { requestedGroups, ROOT, startableGroups, workspaceIncludes } from "../groups.ts"

/** The workspaces `yarn workspaces foreach` traverses with the given `--include` arguments, as repo-relative paths. */
const traversed = (includes: ReadonlyArray<string>): ReadonlyArray<string> =>
  execFileSync("yarn", ["workspaces", "foreach", "-A", ...includes, "exec", "pwd"], { cwd: ROOT, encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((line) => line.startsWith("/"))
    .map((path) => relative(ROOT, path))
    .sort()

describe("yarn dev groups", () => {
  it("offers san-francisco as a group", () => {
    expect(startableGroups()).toContain("san-francisco")
  })

  it("selects both San Francisco servers with --include san-francisco", () => {
    const selected = requestedGroups(["--include", "san-francisco"], startableGroups())
    expect(traversed(workspaceIncludes(selected))).toEqual([
      "backend",
      "browser-app",
      "san-francisco/mcp-servers/data",
      "san-francisco/mcp-servers/documents"
    ])
  })

  it("selects only the backend and the browser app with no group", () => {
    expect(traversed(workspaceIncludes([]))).toEqual(["backend", "browser-app"])
  })

  it("refuses an unknown group", () => {
    expect(() => requestedGroups(["--include", "atlantis"], ["san-francisco"])).toThrow("Unknown group atlantis")
  })
})
