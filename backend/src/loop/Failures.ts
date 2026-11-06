import { Data, Duration, Schema } from "effect"
import { AiError } from "effect/ai"

/** Failures at a limit the loop enforces; they carry no error. */
type LimitTag = "StepLimit" | "ContextLimit" | "Truncated" | "StepTimedOut" | "RequestTimedOut"

/** Failures caused by the model service, the model or the backend, each carrying the raw error for the trace. */
type ErrorTag =
  /** A network or provider server error, still failing after retries. */
  | "ModelUnreachable"
  /** The provider's rate limit, still hit after retries. */
  | "RateLimited"
  | "AuthenticationFailed"
  | "QuotaExhausted"
  /** The provider declined the question under its content policy. */
  | "ContentRefused"
  /** The provider rejected the request the backend built: a backend bug, not the user's question. */
  | "RequestRejected"
  /** The provider's response could not be read. */
  | "UnreadableResponse"
  /** The model kept writing tool calls that could not be run, after the correction retries. */
  | "InvalidToolCalls"
  /** The model failed after part of its answer had reached the browser. */
  | "ModelStopped"
  /** A defect in the backend. */
  | "Internal"

/** Why a question ended without a complete answer. Each has its own message for the user (`messageFor`). */
export type Failure = { readonly _tag: LimitTag } | { readonly _tag: ErrorTag; readonly detail: string }

const limit = (tag: LimitTag) => (): Failure => ({ _tag: tag })
const withDetail =
  (tag: ErrorTag) =>
  ({ detail }: { readonly detail: string }): Failure => ({ _tag: tag, detail })

export const Failure = {
  StepLimit: limit("StepLimit"),
  ContextLimit: limit("ContextLimit"),
  Truncated: limit("Truncated"),
  StepTimedOut: limit("StepTimedOut"),
  RequestTimedOut: limit("RequestTimedOut"),
  ModelUnreachable: withDetail("ModelUnreachable"),
  RateLimited: withDetail("RateLimited"),
  AuthenticationFailed: withDetail("AuthenticationFailed"),
  QuotaExhausted: withDetail("QuotaExhausted"),
  ContentRefused: withDetail("ContentRefused"),
  RequestRejected: withDetail("RequestRejected"),
  UnreadableResponse: withDetail("UnreadableResponse"),
  InvalidToolCalls: withDetail("InvalidToolCalls"),
  ModelStopped: withDetail("ModelStopped"),
  Internal: withDetail("Internal")
}

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

export interface MessageContext {
  readonly requestId: string
  readonly maxSteps: number
  readonly stepTimeout: Duration.Duration
  readonly requestTimeout: Duration.Duration
}

const seconds = (duration: Duration.Duration) => String(Math.round(Duration.toSeconds(duration)))

/** The message the browser app shows for an incomplete answer, from the plan's Messages for the user. */
export const messageFor = (failure: Failure, context: MessageContext): string => {
  switch (failure._tag) {
    case "StepLimit":
      return `This answer is incomplete: the question needed more than ${String(context.maxSteps)} rounds of data lookups, so it was answered from the data gathered so far. Try a narrower question.`
    case "ContextLimit":
      return "This answer is incomplete: the data looked up was more than the model can read at once, so it was answered from part of it. Try a narrower question."
    case "Truncated":
      return "This answer is incomplete: it reached the model's length limit and was cut off. Try a narrower question."
    case "StepTimedOut":
      return `One step took longer than ${seconds(context.stepTimeout)} seconds, so the answer was stopped and is incomplete. Try a narrower question.`
    case "RequestTimedOut":
      return `The answer took longer than ${seconds(context.requestTimeout)} seconds, so it was stopped and is incomplete. Try a narrower question.`
    case "ModelUnreachable":
      return "The model service could not be reached, so no answer was produced. Try again in a moment."
    case "RateLimited":
      return "The model service is limiting how many requests it accepts right now, so no answer was produced. Try again in a minute."
    case "AuthenticationFailed":
      return "The backend could not sign in to the model service, so no answer was produced. Whoever runs the backend needs to check its API key."
    case "QuotaExhausted":
      return "The model service's usage quota has run out, so no answer was produced. Whoever runs the backend needs to check the account."
    case "ContentRefused":
      return "The model service declined to answer this question under its content policy."
    case "RequestRejected":
      return `The model service rejected the request the backend sent, so no answer was produced. This is a problem in the backend, not your question. Request ID: ${context.requestId}.`
    case "UnreadableResponse":
      return "The model service sent a response the backend could not read, so no answer was produced. Try again in a moment."
    case "InvalidToolCalls":
      return "The model kept asking for data in a form the tools could not accept, so no answer was produced. Try rephrasing the question."
    case "ModelStopped":
      return "The model stopped partway through, so this answer is incomplete. Try asking again."
    case "Internal":
      return `The backend hit an unexpected error while answering, so this answer is incomplete. Request ID: ${context.requestId}.`
  }
}
