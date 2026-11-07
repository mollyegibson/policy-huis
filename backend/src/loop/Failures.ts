import { Data, Duration, Schema } from "effect"
import { AiError } from "effect/ai"

interface WithDetail {
  /** The raw error, for the trace only. */
  readonly detail: string
}

/**
 * Why a question ended without a complete answer. A limit the loop enforces carries the limit, which its message
 * names; a failure caused by the model service, the model or the backend carries the raw error for the trace. Each
 * has its own message for the user (`messageFor`).
 */
export type Failure = Data.TaggedEnum<{
  StepLimit: { readonly maxSteps: number }
  /** The next step's prompt, estimated in tokens, would not leave room for an answer. */
  ContextLimit: { readonly estimatedTokens: number; readonly availableTokens: number }
  Truncated: { readonly answerTokens: number }
  StepTimedOut: { readonly timeout: Duration.Duration }
  RequestTimedOut: { readonly timeout: Duration.Duration }
  /** A network or provider server error, still failing after retries. */
  ModelUnreachable: WithDetail
  /** The provider's rate limit, still hit after retries. */
  RateLimited: WithDetail
  AuthenticationFailed: WithDetail
  QuotaExhausted: WithDetail
  /** The provider declined the question under its content policy, or filtered the model's answer. */
  ContentRefused: WithDetail
  /** The model stopped for a reason other than finishing, such as an error or a pause, or one the provider package does not recognize. */
  UnexpectedFinish: WithDetail
  /** The model's response ended without a finish event, so it may have been cut off. */
  MissingFinish: WithDetail
  /** The provider rejected the request the backend built: a backend bug, not the user's question. */
  RequestRejected: WithDetail
  /** The provider's response could not be read. */
  UnreadableResponse: WithDetail
  /** The model kept writing tool calls that could not be run, after the correction retries. */
  InvalidToolCalls: WithDetail
  /** The model failed after part of its answer had reached the browser. */
  ModelStopped: WithDetail
  /** A defect in the backend. */
  Internal: WithDetail
}>

export const Failure = Data.taggedEnum<Failure>()

/** Ends a question early; caught at the top of the loop and turned into its `Finished` event. */
export class LoopFailure extends Data.TaggedError("LoopFailure")<{ readonly failure: Failure }> {}

/** The raw error behind a failure, for the trace only; never sent to the browser. */
export const failureDetail = (failure: Failure): string | null => ("detail" in failure ? failure.detail : null)

/**
 * How a failed model turn is handled: `transient` errors are retried after a backoff, `correct` errors (a tool call
 * the model wrote invalidly) are retried with a message telling the model what was wrong, and `none` fail at once.
 */
export type RetryClass =
  { readonly _tag: "transient" } | { readonly _tag: "correct"; readonly message: string } | { readonly _tag: "none" }

export const retryClass = (error: unknown): RetryClass => {
  if (AiError.isAiError(error)) {
    const reason = error.reason
    switch (reason._tag) {
      case "NetworkError":
      case "RateLimitError":
      case "InternalProviderError":
        return { _tag: "transient" }
      case "ToolParameterValidationError":
        return {
          _tag: "correct",
          message: `Your call to ${reason.toolName} could not be run: ${reason.description}. Call it again with arguments that are valid JSON matching its parameters.`
        }
      case "ToolNotFoundError":
        return {
          _tag: "correct",
          message: `You called ${reason.toolName}, which does not exist. Use only the tools you have been given.`
        }
      default:
        return { _tag: "none" }
    }
  }
  if (error instanceof Schema.SchemaError) {
    return {
      _tag: "correct",
      message:
        "Your last response could not be read: it called a tool that does not exist or with arguments that do not match. Use only the tools you have been given."
    }
  }
  return { _tag: "none" }
}

/** The failure for a model error that is not retried (again), when none of the turn reached the browser. */
export const modelFailure = (error: unknown, detail: string): Failure => {
  if (retryClass(error)._tag === "correct") return Failure.InvalidToolCalls({ detail })
  if (!AiError.isAiError(error)) return Failure.Internal({ detail })
  switch (error.reason._tag) {
    case "RateLimitError":
      return Failure.RateLimited({ detail })
    case "NetworkError":
    case "InternalProviderError":
      return Failure.ModelUnreachable({ detail })
    case "AuthenticationError":
      return Failure.AuthenticationFailed({ detail })
    case "QuotaExhaustedError":
      return Failure.QuotaExhausted({ detail })
    case "ContentPolicyError":
      return Failure.ContentRefused({ detail })
    case "InvalidResponseError":
    case "InvalidOutputError":
    case "StructuredOutputError":
    case "UnknownError":
      return Failure.UnreadableResponse({ detail })
    default:
      return Failure.RequestRejected({ detail })
  }
}

/** The message for a question turned away because the agent is answering as many as it can. */
export const BUSY_MESSAGE = "Another question is being answered. Try again when it finishes."

const seconds = (duration: Duration.Duration) => String(Math.round(Duration.toSeconds(duration)))

/** The message the browser app shows for an incomplete answer, from the plan's Messages for the user. */
export const messageFor = (failure: Failure, requestId: string): string =>
  Failure.$match(failure, {
    StepLimit: ({ maxSteps }) =>
      `This answer is incomplete: the question needed more than ${String(maxSteps)} rounds of data lookups, so it was answered from the data gathered so far. Try a narrower question.`,
    ContextLimit: () =>
      "This answer is incomplete: the data looked up was more than the model can read at once, so it was answered from part of it. Try a narrower question.",
    Truncated: () =>
      "This answer is incomplete: it reached the model's length limit and was cut off. Try a narrower question.",
    StepTimedOut: ({ timeout }) =>
      `One step took longer than ${seconds(timeout)} seconds, so the answer was stopped and is incomplete. Try a narrower question.`,
    RequestTimedOut: ({ timeout }) =>
      `The answer took longer than ${seconds(timeout)} seconds, so it was stopped and is incomplete. Try a narrower question.`,
    ModelUnreachable: () => "The model service could not be reached, so no answer was produced. Try again in a moment.",
    RateLimited: () =>
      "The model service is limiting how many requests it accepts right now, so no answer was produced. Try again in a minute.",
    AuthenticationFailed: () =>
      "The backend could not sign in to the model service, so no answer was produced. Whoever runs the backend needs to check its API key.",
    QuotaExhausted: () =>
      "The model service's usage quota has run out, so no answer was produced. Whoever runs the backend needs to check the account.",
    ContentRefused: () => "The model service declined to answer this question under its content policy.",
    UnexpectedFinish: () =>
      "The model stopped without finishing its answer, so this answer may be incomplete. Try asking again.",
    MissingFinish: () =>
      "The model's response ended before the model said it was done, so this answer may be incomplete. Try asking again.",
    RequestRejected: () =>
      `The model service rejected the request the backend sent, so no answer was produced. This is a problem in the backend, not your question. Request ID: ${requestId}.`,
    UnreadableResponse: () =>
      "The model service sent a response the backend could not read, so no answer was produced. Try again in a moment.",
    InvalidToolCalls: () =>
      "The model kept asking for data in a form the tools could not accept, so no answer was produced. Try rephrasing the question.",
    ModelStopped: () => "The model stopped partway through, so this answer is incomplete. Try asking again.",
    Internal: () =>
      `The backend hit an unexpected error while answering, so this answer is incomplete. Request ID: ${requestId}.`
  })
