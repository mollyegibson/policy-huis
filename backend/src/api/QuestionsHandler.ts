import { Clock, Effect, Layer, Ref, Semaphore, Stream } from "effect"
import { LanguageModel, Prompt } from "effect/ai"
import { HttpApiBuilder } from "effect/http-api"

import type { AgentStreamEvent } from "@policyhuis/protocol/QuestionsApi"
import { AgentUnavailable, Complete, Keepalive, PolicyHuisApi } from "@policyhuis/protocol/QuestionsApi"

import { activeModel, AgentConfig } from "../config/AgentConfig.ts"
import type { LoopSettings } from "../loop/AgentLoop.ts"
import { runAgentLoop } from "../loop/AgentLoop.ts"
import { messageFor } from "../loop/Failures.ts"
import type { LoopEvent } from "../loop/LoopEvent.ts"
import { SystemPrompt } from "../loop/SystemPrompt.ts"
import { McpConnections } from "../tools/McpConnections.ts"
import { buildTurnTools } from "../tools/TurnToolkit.ts"
import type { Trace } from "../trace/Trace.ts"
import { emptyTrace, foldTrace } from "../trace/Trace.ts"
import { TraceStore } from "../trace/TraceStore.ts"

const BUSY_MESSAGE = "Another question is being answered. Try again when it finishes."

/** Tool error types that mean the server itself could not be reached, not that the call was wrong. */
const UNREACHABLE_ERRORS = new Set(["TransportError", "ClosedError"])

const unavailableNotice = (servers: ReadonlyArray<string>) =>
  `These data servers are unreachable for this question: ${servers.join(", ")}. Say that your answer may be missing their data.`

/** `POST /api/v1/questions`: admits the question, runs the loop, streams its events to the browser and writes the trace. */
export const QuestionsLive = HttpApiBuilder.group(PolicyHuisApi, "questions", (handlers) =>
  Effect.gen(function* () {
    const config = yield* AgentConfig
    const { key, endpoint } = yield* activeModel(config)
    const connections = yield* McpConnections
    const traces = yield* TraceStore
    const systemPrompt = yield* SystemPrompt
    const model = yield* LanguageModel.LanguageModel
    const permits = yield* Semaphore.make(endpoint.maxConcurrentQuestions)

    const settings: LoopSettings = {
      ...config.loop,
      contextTokens: endpoint.contextTokens,
      answerTokens: endpoint.answerTokens,
      bytesPerToken: endpoint.bytesPerToken
    }
    const messageContext = (requestId: string) => ({
      requestId,
      maxSteps: config.loop.maxSteps,
      stepTimeout: config.loop.stepTimeout,
      requestTimeout: config.loop.requestTimeout
    })

    return handlers.handle("ask", ({ payload }) =>
      Effect.gen(function* () {
        const admitted = yield* Semaphore.takeIfAvailable(permits, 1)
        if (!admitted) return yield* new AgentUnavailable({ reason: "busy", message: BUSY_MESSAGE })

        const requestId = crypto.randomUUID()
        const receivedAt = yield* Clock.currentTimeMillis
        const tools = yield* buildTurnTools(yield* connections.current, config.tools.callTimeout)
        const prompt = Prompt.make([
          { role: "system", content: systemPrompt.text },
          ...(tools.unavailable.length > 0
            ? [{ role: "system" as const, content: unavailableNotice(tools.unavailable) }]
            : []),
          { role: "user", content: payload.question }
        ])

        const trace = yield* Ref.make<Trace>(emptyTrace)
        const unreachable = yield* Ref.make<ReadonlySet<string>>(new Set(tools.unavailable))
        const closed = yield* Ref.make<ReadonlySet<string>>(new Set())

        /** Records each event in the trace, and the servers a failed call showed to be unreachable. */
        const observe = (event: LoopEvent) =>
          Effect.gen(function* () {
            yield* Ref.update(trace, (current) => foldTrace(current, event))
            if (event._tag !== "ToolEnd" || event.error === null || !UNREACHABLE_ERRORS.has(event.error)) return
            const server = tools.serverOf(event.tool)
            if (server === undefined) return
            yield* Ref.update(unreachable, (servers) => new Set([...servers, server]))
            if (event.error === "ClosedError") yield* Ref.update(closed, (servers) => new Set([...servers, server]))
          })

        /** What the browser receives for an event: the browser's own events as they are, `Finished` as `Complete`. */
        const toBrowser = (event: LoopEvent): Effect.Effect<ReadonlyArray<AgentStreamEvent>> => {
          switch (event._tag) {
            case "TextChunk":
            case "ToolStart":
            case "ToolEnd":
              return Effect.succeed([event])
            case "Finished":
              return Effect.map(Ref.get(unreachable), (servers) => [
                Complete.make({
                  requestId,
                  outcome: event.outcome,
                  message: event.failure === null ? null : messageFor(event.failure, messageContext(requestId)),
                  unavailableServers: [...servers]
                })
              ])
            default:
              return Effect.succeed([])
          }
        }

        const writeTrace = Effect.gen(function* () {
          const endedAt = yield* Clock.currentTimeMillis
          yield* traces
            .write({
              requestId,
              receivedAt: new Date(receivedAt),
              question: payload.question,
              modelConfig: key,
              modelId: endpoint.modelId,
              promptVersion: systemPrompt.version,
              unavailableServers: [...(yield* Ref.get(unreachable))],
              latencyMs: endedAt - receivedAt,
              trace: yield* Ref.get(trace)
            })
            .pipe(Effect.catch((error) => Effect.logError(`Trace ${requestId} was not written`, error.message)))
          yield* Effect.forEach(yield* Ref.get(closed), connections.reconnect, { discard: true })
        })

        const events = runAgentLoop(prompt, tools.toolkit, settings).pipe(
          Stream.tap(observe),
          Stream.mapEffect(toBrowser),
          Stream.flatMap((batch) => Stream.fromIterable(batch)),
          Stream.provideService(LanguageModel.LanguageModel, model)
        )
        const keepalives = Stream.tick(config.api.keepaliveInterval).pipe(Stream.map(() => Keepalive.make({})))

        return Stream.merge(events, keepalives, { haltStrategy: "left" }).pipe(
          Stream.ensuring(writeTrace),
          Stream.ensuring(Semaphore.release(permits, 1))
        )
      }).pipe(
        Effect.onError(() => Semaphore.release(permits, 1)),
        Effect.uninterruptible
      )
    )
  })
)

export const QuestionsApiLive = HttpApiBuilder.layer(PolicyHuisApi).pipe(Layer.provide(QuestionsLive))
