import { Effect, Layer, Stream } from "effect"
import { HttpApiBuilder } from "effect/http-api"

import type { AgentStreamEvent } from "@policyhuis/protocol/QuestionsApi"
import { AgentUnavailable, Complete, Keepalive, PolicyHuisApi } from "@policyhuis/protocol/QuestionsApi"

import type { AgentEvent } from "../agent/Agent.ts"
import { Agent } from "../agent/Agent.ts"
import { AgentConfig } from "../config/AgentConfig.ts"
import { BUSY_MESSAGE } from "../loop/Failures.ts"

const toBrowser = (event: AgentEvent): AgentStreamEvent =>
  event._tag === "QuestionEnded"
    ? Complete.make({
        requestId: event.requestId,
        outcome: event.outcome,
        message: event.message,
        unavailableServers: [...event.unavailableServers]
      })
    : event

/** `POST /api/v1/questions`: asks the agent, and streams its events as server-sent events with keepalives. */
export const QuestionsLive = HttpApiBuilder.group(PolicyHuisApi, "questions", (handlers) =>
  Effect.gen(function* () {
    const agent = yield* Agent
    const config = yield* AgentConfig
    const keepalives = Stream.tick(config.api.keepaliveInterval).pipe(Stream.map(() => Keepalive.make({})))

    return handlers.handle(
      "ask",
      Effect.fn("Questions.ask")(function* ({ payload }) {
        const events = yield* agent
          .ask(payload.question)
          .pipe(
            Effect.catchTag("AgentBusy", () =>
              Effect.fail(new AgentUnavailable({ reason: "busy", message: BUSY_MESSAGE }))
            )
          )
        return Stream.merge(Stream.map(events, toBrowser), keepalives, { haltStrategy: "left" })
      })
    )
  })
)

export const QuestionsApiLive = HttpApiBuilder.layer(PolicyHuisApi).pipe(Layer.provide(QuestionsLive))
