import { Context, Duration, Effect, Layer, Ref, Schema, Stream } from "effect"
import { AiError, LanguageModel, Tool, Toolkit } from "effect/ai"
import type { Prompt, Response } from "effect/ai"

/** One scripted model turn: optional delay, then its parts, then optionally an error or a stall. */
export interface ScriptedTurn {
  readonly delay?: Duration.Input
  readonly parts: ReadonlyArray<Response.StreamPartEncoded>
  readonly failWith?: AiError.AiError
  readonly stall?: boolean
}

export interface RecordedCall {
  readonly prompt: Prompt.Prompt
  readonly toolNames: ReadonlyArray<string>
}

export class ModelCalls extends Context.Service<ModelCalls, Ref.Ref<ReadonlyArray<RecordedCall>>>()(
  "test/ModelCalls"
) {}

const usage = (input?: number, output?: number) => ({
  inputTokens: input === undefined ? {} : { total: input },
  outputTokens: output === undefined ? {} : { total: output }
})

export const text = (id: string, value: string): ReadonlyArray<Response.StreamPartEncoded> => [
  { type: "text-start", id },
  { type: "text-delta", id, delta: value },
  { type: "text-end", id }
]

export const toolCall = (id: string, name: string, params: unknown): Response.StreamPartEncoded => ({
  type: "tool-call",
  id,
  name,
  params
})

export const finish = (
  reason: Response.FinishReason,
  inputTokens?: number,
  outputTokens?: number
): Response.StreamPartEncoded => ({ type: "finish", reason, usage: usage(inputTokens, outputTokens) })

export const aiError = (reason: AiError.AiErrorReason) => AiError.make({ module: "test", method: "streamText", reason })

/**
 * A `LanguageModel` that replays one scripted turn per `streamText` call and records each call's prompt and tool
 * choice. A call past the end of the script dies, so a test fails if the loop calls the model more than expected.
 */
export const scriptedModel = (script: ReadonlyArray<ScriptedTurn>) =>
  Layer.effect(
    LanguageModel.LanguageModel,
    Effect.gen(function* () {
      const calls = yield* ModelCalls
      return yield* LanguageModel.make({
        generateText: () => Effect.die("generateText is not scripted"),
        streamText: (options) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const recorded = yield* Ref.updateAndGet(calls, (all) => [
                ...all,
                {
                  prompt: options.prompt,
                  toolNames: options.tools.map((tool) => Schema.decodeUnknownSync(Schema.String)(tool.name))
                }
              ])
              const turn = script[recorded.length - 1]
              if (turn === undefined) return yield* Effect.die(`no scripted turn ${String(recorded.length)}`)
              if (turn.delay !== undefined) yield* Effect.sleep(turn.delay)
              const parts = Stream.fromIterable(turn.parts)
              if (turn.failWith !== undefined) return parts.pipe(Stream.concat(Stream.fail(turn.failWith)))
              if (turn.stall === true) return parts.pipe(Stream.concat(Stream.never))
              return parts
            })
          )
      })
    })
  ).pipe(Layer.provideMerge(Layer.effect(ModelCalls, Ref.make<ReadonlyArray<RecordedCall>>([]))))

const Lookup = Tool.make("lookup", {
  description: "Look up a value by key",
  parameters: Schema.Struct({ key: Schema.String }),
  success: Schema.Struct({ structuredContent: Schema.Struct({ value: Schema.String, padding: Schema.String }) }),
  failureMode: "return"
})

export const TestToolkit = Toolkit.make(Lookup)

/**
 * `lookup` returns its key's value, shaped like an MCP result's `structuredContent`; key "big" pads the result to
 * 4,000 bytes, for context budget tests.
 */
export const TestToolkitHandlers = TestToolkit.toLayer({
  lookup: ({ key }) =>
    Effect.succeed({
      structuredContent: { value: `value of ${key}`, padding: key === "big" ? "x".repeat(4000) : "" }
    })
})
