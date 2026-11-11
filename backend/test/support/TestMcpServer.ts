import { createServer } from "node:http"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { Context, Effect, Exit, Layer, Schema, Scope } from "effect"
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/ai"
import { HttpRouter, HttpServer } from "effect/http"

class UnknownWord extends Schema.TaggedError<UnknownWord>()("UnknownWord", { word: Schema.String }) {}

/** The tool error, by the convention every server follows, for a server that cannot reach its own database. */
class DatabaseUnavailable extends Schema.TaggedError<DatabaseUnavailable>()("DatabaseUnavailable", {}) {}

const TestCitation = Schema.Struct({
  citationId: Schema.String,
  sourceId: Schema.String,
  title: Schema.String,
  publisher: Schema.NullOr(Schema.String),
  sourceUrl: Schema.String,
  version: Schema.String,
  locator: Schema.NullOr(Schema.String),
  quote: Schema.NullOr(Schema.String)
})

/** A citation of `word` that follows the citation convention, under the namespace `test`. */
export const echoCitation = (word: string) => ({
  citationId: `test.echo@1#${word}`,
  sourceId: "test.echo@1",
  title: "Echo",
  publisher: null,
  sourceUrl: "https://example.org/echo",
  version: "1",
  locator: `The word ${word}`,
  quote: null
})

const Echo = Tool.make("echo", {
  description: "Echo a word back, with a citation",
  parameters: Schema.Struct({ word: Schema.String }),
  success: Schema.Struct({ word: Schema.String, citations: Schema.Array(TestCitation) }),
  failure: Schema.Union([UnknownWord, DatabaseUnavailable]),
  failureMode: "return"
}).annotate(Tool.Title, "Echo a word")

const EchoTools = Toolkit.make(Echo)

/**
 * `echo` returns its word with one citation; it fails with `UnknownWord` for the word "unknown", and with
 * `DatabaseUnavailable` for "offline".
 */
const EchoHandlers = EchoTools.toLayer({
  echo: ({ word }) =>
    word === "unknown"
      ? Effect.fail(new UnknownWord({ word }))
      : word === "offline"
        ? Effect.fail(new DatabaseUnavailable())
        : Effect.succeed({ word, citations: [echoCitation(word)] })
})

const serverOn = (port: number) =>
  HttpRouter.serve(
    McpServer.layerHttp({
      name: "test",
      version: "0.0.0",
      path: "/mcp",
      protocols: [McpProtocol.v2026_07_28],
      registrations: McpServer.toolkit(EchoTools).pipe(Layer.provide(EchoHandlers))
    }),
    { disableListenLog: true, disableLogger: true }
  ).pipe(Layer.provideMerge(NodeHttpServer.layer(createServer, { port })))

export interface RunningServer {
  readonly port: number
  readonly url: string
  readonly stop: Effect.Effect<void>
}

/** Starts a test MCP server on `port` (0 for any free port) until `stop`. */
export const startTestServer = Effect.fn("startTestServer")(function* (port: number) {
  const scope = yield* Scope.make()
  const context = yield* Layer.buildWithScope(serverOn(port), scope)
  const address = Context.get(context, HttpServer.HttpServer).address
  if (address._tag === "UnixPathAddress") return yield* Effect.die("expected a TCP address")
  const running: RunningServer = {
    port: address.port,
    url: `http://127.0.0.1:${String(address.port)}/mcp`,
    stop: Scope.close(scope, Exit.void)
  }
  return running
})
