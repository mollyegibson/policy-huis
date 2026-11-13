import { Cause, Clock, Duration, Effect, Ref, Stream } from "effect"
import { LanguageModel, Prompt } from "effect/ai"
import type { Response, Tool, Toolkit } from "effect/ai"
import { v5 as uuidV5 } from "uuid"

import { LookupEnded, LookupStarted, Sources, TextChunk } from "@policyhuis/protocol/QuestionsApi"

import type { CitationKeys } from "./CitationKeys.ts"
import { expandKeys, keyResultParts, NO_KEYS, splitOpenMarker, withResultKeys } from "./CitationKeys.ts"
import { estimateNextPromptTokens, fits } from "./ContextBudget.ts"
import { Failure, LoopFailure, modelFailure, retryClass } from "./Failures.ts"
import type { LoopEvent } from "./LoopEvent.ts"
import {
  CitationsRejected,
  Finished,
  isBrowserEvent,
  ModelRetried,
  StepEnded,
  StepStarted,
  ToolCallEnded,
  ToolCallStarted,
  ToolFailed
} from "./LoopEvent.ts"
import type { Outcome } from "./Outcome.ts"
import { errorType, failedOutcome, readCitations, structuredContent } from "./ToolResults.ts"

export interface LoopSettings {
  readonly maxSteps: number
  readonly stepTimeout: Duration.Duration
  readonly requestTimeout: Duration.Duration
  readonly modelRetries: number
  readonly modelRetryBaseDelay: Duration.Duration
  readonly toolConcurrency: number
  /** Whether the first step must call a tool, so the model looks something up before it answers. */
  readonly requireFirstLookup: boolean
  readonly contextTokens: number
  readonly answerTokens: number
  readonly bytesPerToken: number
}

const STEP_LIMIT_NOTICE =
  "You have reached the limit on data lookups for this question. Answer now from the tool results above, citing them, and say what you could not check."

const CONTEXT_LIMIT_NOTICE =
  "The data looked up is more than you can read at once. Answer now from the tool results above, citing them, and say what you could not check."

/**
 * The UUID the backend gives a tool call: a version 5 UUID of the provider's call ID within the turn's own UUID. The
 * provider's ID need not be unique across a question, but is within one turn, where the model matches each result to
 * its call; so a call and its result get the same UUID, and calls in different turns never share one.
 */
const callIdFor = (turnId: string, providerCallId: string) => uuidV5(providerCallId, turnId)

/** The server that offers a tool: its name and label from the server directory, and the tool's title. */
export interface ToolOwner {
  readonly name: string
  readonly label: string
  readonly title: string
}

/** The server a prefixed tool name belongs to, or null if none offers it. */
export type ServerOf = (toolName: string) => ToolOwner | null

/** The events for one stream part that arrived at `at`, in the turn with UUID `turnId`. */
const partEvents = <Tools extends Record<string, Tool.Any>>(
  turnId: string,
  serverOf: ServerOf,
  part: Response.StreamPart<Tools, "opaque">,
  at: number
): ReadonlyArray<LoopEvent> => {
  switch (part.type) {
    case "text-delta":
      return [TextChunk.make({ text: part.delta })]
    case "tool-call": {
      const callId = callIdFor(turnId, part.id)
      const args: unknown = part.params
      const owner = serverOf(part.name)
      return [
        LookupStarted.make({
          lookupId: callId,
          source: owner === null ? null : { name: owner.name, label: owner.label },
          tool: part.name,
          title: owner?.title ?? part.name,
          arguments: args
        }),
        new ToolCallStarted({ callId, providerCallId: part.id, tool: part.name, arguments: args, at })
      ]
    }
    case "tool-result": {
      if (part.preliminary) return []
      const callId = callIdFor(turnId, part.id)
      const ended = new ToolCallEnded({ callId, at })
      if (!part.isFailure) {
        const result = structuredContent(part.result)
        const { citations, rejected, missing } = readCitations(result)
        return [
          LookupEnded.make({ lookupId: callId, outcome: "succeeded", result, error: null }),
          ...(citations.length > 0 ? [Sources.make({ lookupId: callId, citations })] : []),
          ...(rejected > 0 || missing ? [new CitationsRejected({ callId, tool: part.name, rejected, missing })] : []),
          ended
        ]
      }
      const encodedError: unknown = part.encodedResult
      const type = errorType(part.result)
      return [
        LookupEnded.make({ lookupId: callId, outcome: failedOutcome(type), result: null, error: type }),
        new ToolFailed({ callId, encodedError }),
        ended
      ]
    }
    default:
      return []
  }
}

const stepEnded = (parts: ReadonlyArray<Response.AnyPart>): StepEnded => {
  const finish = parts.find((part): part is Response.FinishPart => part.type === "finish")
  return new StepEnded({
    parts,
    finishReason: finish?.reason ?? null,
    inputTokens: finish?.usage.inputTokens.total,
    outputTokens: finish?.usage.outputTokens.total
  })
}

/**
 * What a turn has produced so far. A turn that may call tools holds its text in `heldText` until it ends: text from a
 * turn that calls a tool ("Let me look that up") is narration and is never sent, and the answer's text is sent once
 * the turn finishes without one. The final turn has no tools, so its text is never held.
 */
interface TurnState {
  readonly parts: ReadonlyArray<Response.AnyPart>
  readonly heldText: ReadonlyArray<LoopEvent>
  readonly calledTool: boolean
}

const EMPTY_TURN: TurnState = { parts: [], heldText: [], calledTool: false }

/** At the end of a turn: its held text, unless it called a tool, then `StepEnded`. */
const endTurn = (state: TurnState): ReadonlyArray<LoopEvent> => [
  ...(state.calledTool ? [] : state.heldText),
  stepEnded(state.parts)
]

/** One part from the model stream and when it arrived, or the stream's successful end. */
type TurnInput<Tools extends Record<string, Tool.Any>> =
  | { readonly _tag: "Part"; readonly part: Response.StreamPart<Tools, "opaque">; readonly at: number }
  | { readonly _tag: "End" }

/** Adds one part to the turn, returning the events to send now; at the end, sends what the turn held back. */
const advanceTurn =
  (turnId: string, serverOf: ServerOf, final: boolean) =>
  <Tools extends Record<string, Tool.Any>>(
    state: TurnState,
    input: TurnInput<Tools>
  ): readonly [TurnState, ReadonlyArray<LoopEvent>] => {
    if (input._tag === "End") return [state, endTurn(state)]
    const parts = [...state.parts, input.part]
    const events = partEvents(turnId, serverOf, input.part, input.at)
    if (final) return [{ ...state, parts }, events]
    const calledTool = state.calledTool || events.some((event) => event._tag === "LookupStarted")
    const text = events.filter((event) => event._tag === "TextChunk")
    const heldText = calledTool ? [] : [...state.heldText, ...text]
    return [{ parts, heldText, calledTool }, events.filter((event) => event._tag !== "TextChunk")]
  }

/**
 * Writes the model's citation keys as full citation IDs in each `TextChunk`, holding back a tail that may be a
 * citation the next chunk completes; the held text is sent before the turn's `StepEnded`.
 */
const expandTurnText =
  (keys: CitationKeys) =>
  (held: string, event: LoopEvent): readonly [string, ReadonlyArray<LoopEvent>] => {
    const chunk = (text: string) => (text === "" ? [] : [TextChunk.make({ text: expandKeys(text, keys) })])
    if (event._tag === "TextChunk") {
      const [ready, rest] = splitOpenMarker(held + event.text)
      return [rest, chunk(ready)]
    }
    if (event._tag === "StepEnded") return ["", [...chunk(held), event]]
    return [held, [event]]
  }

/** Fails the stream with `failure` once `duration` has passed. */
const failAfter = (duration: Duration.Duration, failure: Failure) =>
  Effect.sleep(duration).pipe(Effect.andThen(Effect.fail(new LoopFailure({ failure }))))

const hasToolCalls = (ended: StepEnded) => ended.parts.some((part) => part.type === "tool-call")

/** What a finished turn means for the question: run another step, or end with an outcome. */
type TurnEnd =
  { readonly _tag: "Continue" } | { readonly _tag: "End"; readonly outcome: Outcome; readonly failure: Failure | null }

/**
 * A turn that stops at the output cap is cut off, whatever else it did. A turn with tool calls continues, unless it
 * is the final turn, which has no tools. Otherwise only `stop` is a finished answer: a content filter is a refusal,
 * and any other reason (an error, a pause, an unknown or missing reason) means the answer may be incomplete.
 */
export const turnEnd = (
  ended: StepEnded,
  final: boolean,
  answerTokens: number,
  answered: Outcome,
  answeredFailure: Failure | null
): TurnEnd => {
  if (ended.finishReason === null) {
    return {
      _tag: "End",
      outcome: "failed",
      failure: Failure.MissingFinish({ detail: "the model's response ended without a finish event" })
    }
  }
  if (ended.finishReason === "length") {
    return { _tag: "End", outcome: "truncated", failure: Failure.Truncated({ answerTokens }) }
  }
  if (!final && hasToolCalls(ended)) return { _tag: "Continue" }
  switch (ended.finishReason) {
    case "stop":
      return { _tag: "End", outcome: answered, failure: answeredFailure }
    case "content-filter":
      return {
        _tag: "End",
        outcome: "failed",
        failure: Failure.ContentRefused({ detail: "the model finished with reason content-filter" })
      }
    default:
      return {
        _tag: "End",
        outcome: "failed",
        failure: Failure.UnexpectedFinish({ detail: `the model finished with reason ${ended.finishReason}` })
      }
  }
}

/**
 * Answers one question: model turns with tools until the model answers or a limit is reached, as a stream of
 * `LoopEvent`s that always ends with `Finished` unless it is interrupted. The stream itself never fails. `serverOf`
 * names the server each tool call goes to, for its `LookupStarted`.
 */
export const runAgentLoop = <Tools extends Record<string, Tool.Any>>(
  initialPrompt: Prompt.Prompt,
  toolkit: Toolkit.WithHandler<Tools>,
  serverOf: ServerOf,
  settings: LoopSettings
) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const retriesLeft = yield* Ref.make(settings.modelRetries)

      type LoopStream = Stream.Stream<
        LoopEvent,
        LoopFailure,
        LanguageModel.LanguageModel | Tool.HandlerServices<Tools[keyof Tools]>
      >

      /** Retries a turn that failed before any of it reached the browser, by its error's class, or fails it. */
      const retryOrFail = (
        cause: Cause.Cause<unknown>,
        prompt: Prompt.Prompt,
        final: boolean,
        keys: CitationKeys,
        required: boolean
      ): LoopStream =>
        Stream.unwrap(
          Effect.gen(function* () {
            const error = Cause.squash(cause)
            const detail = Cause.pretty(cause)
            const retry = retryClass(error)
            const left = yield* Ref.get(retriesLeft)
            if (retry._tag === "none" || left === 0) {
              return Stream.fail(new LoopFailure({ failure: modelFailure(error, detail) }))
            }
            yield* Ref.set(retriesLeft, left - 1)
            const retried = Stream.make(new ModelRetried({ reason: detail }))
            if (retry._tag === "correct") {
              return Stream.concat(
                retried,
                turn(Prompt.concat(prompt, Prompt.make(retry.message)), final, keys, required)
              )
            }
            yield* Effect.sleep(Duration.times(settings.modelRetryBaseDelay, 2 ** (settings.modelRetries - left)))
            return Stream.concat(retried, turn(prompt, final, keys, required))
          })
        )

      /**
       * One model turn, ending with its `StepEnded`. The final turn is called without tools; a `required` turn must
       * call one, unless no tool is offered. `keys` are the citation keys the prompt's tool results use, which the
       * turn's text is expanded from.
       */
      const turn = (prompt: Prompt.Prompt, final: boolean, keys: CitationKeys, required: boolean): LoopStream =>
        Stream.unwrap(
          Effect.gen(function* () {
            const turnId = crypto.randomUUID()
            const reachedBrowser = yield* Ref.make(false)
            const model = final
              ? LanguageModel.streamText({ prompt })
              : LanguageModel.streamText({
                  prompt,
                  toolkit,
                  concurrency: settings.toolConcurrency,
                  toolChoice: required && Object.keys(toolkit.tools).length > 0 ? "required" : "auto"
                })
            return model.pipe(
              Stream.mapEffect((part) =>
                Effect.map(Clock.currentTimeMillis, (at): TurnInput<Tools> => ({ _tag: "Part", part, at }))
              ),
              Stream.concat(Stream.succeed<TurnInput<Tools>>({ _tag: "End" })),
              Stream.mapAccum(() => EMPTY_TURN, advanceTurn(turnId, serverOf, final)),
              Stream.mapAccum(() => "", expandTurnText(keys)),
              Stream.tap((event) => (isBrowserEvent(event) ? Ref.set(reachedBrowser, true) : Effect.void)),
              Stream.catchCause((cause) =>
                Stream.unwrap(
                  Effect.gen(function* () {
                    if (Cause.hasInterruptsOnly(cause)) return Stream.fromEffect(Effect.interrupt)
                    if (yield* Ref.get(reachedBrowser)) {
                      const detail = Cause.pretty(cause)
                      return Stream.fail(new LoopFailure({ failure: Failure.ModelStopped({ detail }) }))
                    }
                    return retryOrFail(cause, prompt, final, keys, required)
                  })
                )
              )
            )
          })
        )

      const finished = (outcome: Outcome, failure: Failure | null) => Stream.make(new Finished({ outcome, failure }))

      /**
       * A turn bounded by the step timeout, then what its end means: `next` when it called tools, else `Finished`
       * with its outcome. The turn's `StepEnded` is kept in a ref and read after the turn's stream has ended, so the
       * step timeout never covers the steps that follow.
       */
      const timedTurn = (
        prompt: Prompt.Prompt,
        keys: CitationKeys,
        step: number,
        final: boolean,
        answered: Outcome,
        answeredFailure: Failure | null,
        next: (ended: StepEnded) => LoopStream
      ): LoopStream =>
        Stream.unwrap(
          Effect.gen(function* () {
            const ended = yield* Ref.make<StepEnded | null>(null)
            const timeout = failAfter(settings.stepTimeout, Failure.StepTimedOut({ timeout: settings.stepTimeout }))
            const required = !final && step === 0 && settings.requireFirstLookup
            const events = turn(prompt, final, keys, required).pipe(
              Stream.tap((event) => (event._tag === "StepEnded" ? Ref.set(ended, event) : Effect.void)),
              Stream.interruptWhen(timeout)
            )
            const then = Stream.unwrap(
              Effect.map(Ref.get(ended), (last): LoopStream => {
                if (last === null) return Stream.die("a model turn ended without its StepEnded event")
                const end = turnEnd(last, final, settings.answerTokens, answered, answeredFailure)
                return end._tag === "Continue" ? next(last) : finished(end.outcome, end.failure)
              })
            )
            return Stream.make(new StepStarted({ step, final })).pipe(Stream.concat(events), Stream.concat(then))
          })
        )

      /** The turn without tools that answers from what was gathered when a limit is reached. */
      const finalTurn = (
        prompt: Prompt.Prompt,
        keys: CitationKeys,
        notice: string,
        step: number,
        outcome: Outcome,
        failure: Failure
      ) =>
        timedTurn(Prompt.concat(prompt, Prompt.make(notice)), keys, step, true, outcome, failure, () =>
          Stream.die("the final turn has no tools to continue with")
        )

      /**
       * The turn at `step` and those after it. Each turn's tool results join the next prompt with their citation IDs
       * replaced by keys (see `CitationKeys`); the trace and the browser keep the results as the servers sent them.
       */
      const steps = (prompt: Prompt.Prompt, keys: CitationKeys, step: number): LoopStream => {
        if (step >= settings.maxSteps) {
          const limit = Failure.StepLimit({ maxSteps: settings.maxSteps })
          return finalTurn(prompt, keys, STEP_LIMIT_NOTICE, step, "step_limit", limit)
        }
        return timedTurn(prompt, keys, step, false, "answered", null, (ended) => {
          const nextKeys = withResultKeys(keys, ended.parts)
          const next = Prompt.concat(prompt, Prompt.fromResponseParts(keyResultParts(ended.parts, nextKeys)))
          const estimatedTokens = estimateNextPromptTokens(ended, next, settings)
          if (fits(estimatedTokens, settings)) return steps(next, nextKeys, step + 1)
          const limit = Failure.ContextLimit({
            estimatedTokens: Math.ceil(estimatedTokens),
            availableTokens: settings.contextTokens - settings.answerTokens
          })
          return finalTurn(prompt, keys, CONTEXT_LIMIT_NOTICE, step + 1, "context_limit", limit)
        })
      }

      const requestTimeout = Failure.RequestTimedOut({ timeout: settings.requestTimeout })
      return steps(initialPrompt, NO_KEYS, 0).pipe(
        Stream.interruptWhen(failAfter(settings.requestTimeout, requestTimeout)),
        Stream.catchCause((cause) => {
          if (Cause.hasInterruptsOnly(cause)) return Stream.fromEffect(Effect.interrupt)
          const error = Cause.squash(cause)
          const failure =
            error instanceof LoopFailure ? error.failure : Failure.Internal({ detail: Cause.pretty(cause) })
          return finished("failed", failure)
        })
      )
    })
  )
