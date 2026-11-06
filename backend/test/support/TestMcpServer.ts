import { createServer } from "node:http"

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { Context, Effect, Exit, Layer, Schema, Scope } from "effect"
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/ai"
import { HttpRouter, HttpServer } from "effect/http"

class UnknownWord extends Schema.TaggedError<UnknownWord>()("UnknownWord", { word: Schema.String }) {}

const Echo = Tool.make("echo", {
  description: "Echo a word back, with a citation",
  parameters: Schema.Struct({ word: Schema.String }),
  success: Schema.Struct({
    word: Schema.String,
    citations: Schema.Array(Schema.Struct({ citationId: Schema.String }))
  }),
  failure: UnknownWord,
  failureMode: "return"
})

const EchoTools = Toolkit.make(Echo)

/** `echo` returns its word with one citation, and fails with `UnknownWord` for the word "unknown". */
const EchoHandlers = EchoTools.toLayer({
  echo: ({ word }) =>
    word === "unknown"
      ? Effect.fail(new UnknownWord({ word }))
      : Effect.succeed({ word, citations: [{ citationId: `c#${word}` }] })
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
