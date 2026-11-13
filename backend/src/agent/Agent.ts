import { Clock, Context, Data, Effect, Layer, Option, Ref, Schema, Semaphore, Stream } from "effect"
import { LanguageModel, Prompt } from "effect/ai"

import type { Citation } from "@policyhuis/protocol/Citation"
import { Sources } from "@policyhuis/protocol/QuestionsApi"

import { AgentConfig, modelSettings } from "../config/AgentConfig.ts"
import type { LoopSettings } from "../loop/AgentLoop.ts"
import { runAgentLoop } from "../loop/AgentLoop.ts"
import { messageFor } from "../loop/Failures.ts"
import type { BrowserEvent, LoopEvent } from "../loop/LoopEvent.ts"
import { isBrowserEvent } from "../loop/LoopEvent.ts"
import type { AvailableModel } from "../model/ModelLayer.ts"
import { Models } from "../model/ModelLayer.ts"
import type { Outcome } from "../loop/Outcome.ts"
import { SystemPrompt } from "../loop/SystemPrompt.ts"
import { McpConnections } from "../tools/McpConnections.ts"
import { turnTools } from "../tools/TurnToolkit.ts"
import type { Trace } from "../trace/Trace.ts"
import { emptyTrace, foldTrace } from "../trace/Trace.ts"
import { TraceStore } from "../trace/TraceStore.ts"

/** The agent is already answering as many questions as the question's model configuration allows. */
export class AgentBusy extends Schema.TaggedError<AgentBusy>()("AgentBusy", {}) {}

/** The question named a model configuration the backend does not offer. */
export class ModelNotOffered extends Schema.TaggedError<ModelNotOffered>()("ModelNotOffered", {
  model: Schema.String,
  offered: Schema.Array(Schema.String)
}) {}

/** How to answer one question: the model configuration to answer with, the default when absent, and its evaluation run. */
export interface AskOptions {
  readonly model?: string | undefined
  readonly evaluationRunId?: string | undefined
}

/**
 * A question's last event: how it ended, the message for the user when the answer is incomplete, and the data
 * servers that could not be reached.
 */
export class QuestionEnded extends Data.TaggedClass("QuestionEnded")<{
  readonly requestId: string
  readonly outcome: Outcome
  readonly message: string | null
  readonly unavailableServers: ReadonlyArray<string>
  readonly model: { readonly configuration: string; readonly modelId: string }
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number }
}> {}

/** What a caller of the agent receives: the answer's events as they happen, then `QuestionEnded`. */
export type AgentEvent = BrowserEvent | QuestionEnded

/** Appended to the system prompt when a server is unreachable, so the model can say what it could not check. */
const unavailableNotice = (servers: ReadonlyArray<string>) =>
  `These data servers are unreachable for this question: ${servers.join(", ")}. Say that your answer may be missing their data.`

/**
 * Answers questions: admits each one within its model configuration's limit, builds its tools and prompt, runs the
 * loop with that configuration's model, notes the servers a call showed to be unreachable, and writes the trace after
 * the answer has ended.
 */
export class Agent extends Context.Service<
  Agent,
  {
    readonly ask: (
      question: string,
      options?: AskOptions
    ) => Effect.Effect<Stream.Stream<AgentEvent>, AgentBusy | ModelNotOffered>
  }
>()("backend/Agent") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* AgentConfig
      const models = yield* Models
      const connections = yield* McpConnections
      const traces = yield* TraceStore
      const systemPrompt = yield* SystemPrompt
      /** Owns the trace writes, which run after each answer has ended; closed when the agent stops. */
      const background = yield* Effect.scope

      const answer = Effect.fn("Agent.answer")(function* (
        question: string,
        { key, endpoint, model }: AvailableModel,
        evaluationRunId: string | null
      ) {
        const settings: LoopSettings = {
          ...config.loop,
          requireFirstLookup: endpoint.provider === "openai-compat" && endpoint.requireFirstLookup === true,
          contextTokens: endpoint.contextTokens,
          answerTokens: endpoint.answerTokens,
          bytesPerToken: endpoint.bytesPerToken
        }
        const requestId = crypto.randomUUID()
        const receivedAt = yield* Clock.currentTimeMillis
        const tools = turnTools(yield* connections.current)
        for (const { tool, servers } of tools.collisions) {
          yield* Effect.logError(`${servers.join(" and ")} both offer the tool ${tool}; it is offered by neither`)
        }
        const system =
          tools.unavailable.length === 0
            ? systemPrompt.text
            : `${systemPrompt.text}\n\n${unavailableNotice(tools.unavailable)}`
        const prompt = Prompt.make([
          { role: "system", content: system },
          { role: "user", content: question }
        ])

        const trace = yield* Ref.make<Trace>(emptyTrace)
        const unreachable = yield* Ref.make<ReadonlySet<string>>(new Set(tools.unavailable))
        /** The server each lookup went to, by lookup ID. */
        const lookupServers = yield* Ref.make<ReadonlyMap<string, string>>(new Map())
        /** Every citation sent so far, by `citationId`. */
        const sent = yield* Ref.make<ReadonlyMap<string, Citation>>(new Map())

        /**
         * Records each event in the trace, the servers an unavailable lookup showed to be unreachable, and logs
         * citations a server returned that could not be read.
         */
        const observe = (event: LoopEvent) =>
          Effect.gen(function* () {
            yield* Ref.update(trace, (current) => foldTrace(current, event))
            if (event._tag === "LookupStarted" && event.source !== null) {
              const server = event.source.name
              yield* Ref.update(lookupServers, (servers) => new Map([...servers, [event.lookupId, server]]))
            }
            if (event._tag === "LookupEnded" && event.outcome === "unavailable") {
              const server = (yield* Ref.get(lookupServers)).get(event.lookupId)
              if (server !== undefined) yield* Ref.update(unreachable, (servers) => new Set([...servers, server]))
            }
            if (event._tag === "CitationsRejected") {
              yield* Effect.logWarning(
                event.missing
                  ? `${event.tool} returned a result with no citations list`
                  : `${event.tool} returned ${String(event.rejected)} citations that break the citation convention`
              )
            }
          })

        /**
         * The citations not sent before in this question. A repeated `citationId` is dropped; one whose content
         * differs from the citation first sent under it is logged, since a server should give one ID one meaning.
         */
        const unsent = (sources: Sources) =>
          Effect.gen(function* () {
            const before = yield* Ref.get(sent)
            const fresh: Array<Citation> = []
            for (const citation of sources.citations) {
              const earlier = before.get(citation.citationId)
              if (earlier === undefined) {
                if (!fresh.some((c) => c.citationId === citation.citationId)) fresh.push(citation)
              } else if (JSON.stringify(earlier) !== JSON.stringify(citation)) {
                yield* Effect.logWarning(`Citation ${citation.citationId} was returned with different content`)
              }
            }
            yield* Ref.set(sent, new Map([...before, ...fresh.map((c): [string, Citation] => [c.citationId, c])]))
            return fresh
          })

        const toAgentEvents = (event: LoopEvent): Effect.Effect<ReadonlyArray<AgentEvent>> => {
          if (event._tag === "Sources") {
            return Effect.map(unsent(event), (citations) =>
              citations.length === 0 ? [] : [Sources.make({ lookupId: event.lookupId, citations })]
            )
          }
          if (isBrowserEvent(event)) return Effect.succeed([event])
          if (event._tag !== "Finished") return Effect.succeed([])
          return Effect.gen(function* () {
            const servers = yield* Ref.get(unreachable)
            const { inputTokens, outputTokens } = yield* Ref.get(trace)
            return [
              new QuestionEnded({
                requestId,
                outcome: event.outcome,
                message: event.failure === null ? null : messageFor(event.failure, requestId),
                unavailableServers: [...servers],
                model: { configuration: key, modelId: endpoint.modelId },
                usage: { inputTokens, outputTokens }
              })
            ]
          })
        }

        const writeTrace = Effect.gen(function* () {
          const endedAt = yield* Clock.currentTimeMillis
          yield* traces
            .write({
              requestId,
              receivedAt: new Date(receivedAt),
              question,
              modelConfig: key,
              modelId: endpoint.modelId,
              modelSettings: modelSettings(endpoint),
              evaluationRunId,
              promptVersion: systemPrompt.version,
              unavailableServers: [...(yield* Ref.get(unreachable))],
              latencyMs: endedAt - receivedAt,
              trace: yield* Ref.get(trace)
            })
            .pipe(Effect.catch((error) => Effect.logError(`Trace ${requestId} was not written`, error.message)))
        })

        return runAgentLoop(prompt, tools.toolkit, tools.serverOf, settings).pipe(
          Stream.tap(observe),
          Stream.mapEffect(toAgentEvents),
          Stream.flatMap((batch) => Stream.fromIterable(batch)),
          Stream.provideService(LanguageModel.LanguageModel, model),
          Stream.ensuring(Effect.forkIn(writeTrace, background))
        )
      })

      /**
       * Finds the question's model configuration, takes one of its permits and returns the answer's events; the
       * permit is released when the stream ends, however it ends, before the trace is written. The take and the
       * stream's construction run uninterruptibly, so an interruption between them cannot leak a permit.
       */
      const ask = Effect.fn("Agent.ask")(function* (question: string, options: AskOptions = {}) {
        const requested = options.model
        const available =
          requested === undefined
            ? models.default
            : yield* Option.match(models.find(requested), {
                onNone: () =>
                  Effect.fail(
                    new ModelNotOffered({ model: requested, offered: models.offered.map((offered) => offered.key) })
                  ),
                onSome: Effect.succeed
              })
        const { permits } = available
        const admitted = yield* Semaphore.takeIfAvailable(permits, 1)
        if (!admitted) return yield* new AgentBusy()
        const events = yield* answer(question, available, options.evaluationRunId ?? null).pipe(
          Effect.onError(() => Semaphore.release(permits, 1))
        )
        return events.pipe(Stream.ensuring(Semaphore.release(permits, 1)))
      }, Effect.uninterruptible)

      return { ask }
    })
  )
}
