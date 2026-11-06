import { fileURLToPath } from "node:url"

import { Context, Effect, Layer, Schema } from "effect"

import { decodeConfig, HttpUrl, readYaml } from "./ConfigFile.ts"

export const SERVER_DIRECTORY_FILE = fileURLToPath(new URL("../../config/servers.yaml", import.meta.url))

const ServerName = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^[a-z][a-z0-9-]*$/, {
      message: "A server name is lowercase letters, digits and hyphens, starting with a letter"
    })
  )
)

/** Prepended to each of the server's tool names, so the model can tell same-purpose tools apart across servers. */
const ToolPrefix = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^[a-z][a-z0-9]*_$/, {
      message: "A tool prefix is lowercase letters and digits, starting with a letter and ending with an underscore"
    })
  )
)

export const ServerEntry = Schema.Struct({
  name: ServerName,
  url: HttpUrl,
  prefix: ToolPrefix
})
export type ServerEntry = typeof ServerEntry.Type

const duplicates = (values: ReadonlyArray<string>) => values.filter((value, index) => values.indexOf(value) !== index)

/** `backend/config/servers.yaml`: the MCP servers this deployment answers from. Names and prefixes are unique. */
export const ServerDirectoryFile = Schema.Struct({
  servers: Schema.Array(ServerEntry).pipe(
    Schema.check(
      Schema.makeFilter((servers) => {
        const issues: Array<Schema.FilterIssue> = []
        for (const name of new Set(duplicates(servers.map((s) => s.name)))) {
          issues.push(`Two servers are named "${name}"`)
        }
        for (const prefix of new Set(duplicates(servers.map((s) => s.prefix)))) {
          issues.push(`Two servers use the tool prefix "${prefix}"`)
        }
        return issues
      })
    )
  )
})
export type ServerDirectoryFile = typeof ServerDirectoryFile.Type

export const loadServerDirectory = Effect.fn("ServerDirectory.load")(function* (path: string) {
  return yield* decodeConfig(ServerDirectoryFile)(path, yield* readYaml(path))
})

export class ServerDirectory extends Context.Service<ServerDirectory, ServerDirectoryFile>()(
  "backend/ServerDirectory"
) {
  static readonly layer = (path: string = SERVER_DIRECTORY_FILE) => Layer.effect(this, loadServerDirectory(path))
}
