import { Effect, Layer, Stream } from "effect"
import { HttpApiBuilder } from "effect/http-api"

import type { AgentStreamEvent } from "@policyhuis/protocol/QuestionsApi"
import { AgentUnavailable, Complete, Keepalive, PolicyHuisApi, UnknownModel } from "@policyhuis/protocol/QuestionsApi"

import type { AgentEvent } from "../agent/Agent.ts"
import { Agent } from "../agent/Agent.ts"
import { AgentConfig } from "../config/AgentConfig.ts"
import { BUSY_MESSAGE } from "../loop/Failures.ts"
import { Models } from "../model/ModelLayer.ts"

const toBrowser = (event: AgentEvent): AgentStreamEvent =>
  event._tag === "QuestionEnded"
    ? Complete.make({
        requestId: event.requestId,
        outcome: event.outcome,
        message: event.message,
        unavailableServers: [...event.unavailableServers],
        model: event.model,
        usage: event.usage
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
          .ask(payload.question, { model: payload.model, evaluationRunId: payload.evaluationRunId })
          .pipe(
            Effect.catchTags({
              AgentBusy: () => Effect.fail(new AgentUnavailable({ reason: "busy", message: BUSY_MESSAGE })),
              ModelNotOffered: ({ model, offered }) =>
                Effect.fail(
                  new UnknownModel({
                    model,
                    offered: [...offered],
                    message: `No model configuration "${model}"; offered: ${offered.join(", ")}`
                  })
                )
            })
          )
        return Stream.merge(Stream.map(events, toBrowser), keepalives, { haltStrategy: "left" })
      })
    )
  })
)

/** `GET /api/v1/models`: the offered model configurations, from `agent.yaml`, and the default. */
export const ModelsLive = HttpApiBuilder.group(PolicyHuisApi, "models", (handlers) =>
  Effect.gen(function* () {
    const models = yield* Models
    const listing = {
      default: models.default.key,
      models: models.offered.map(({ key, endpoint }) => ({
        configuration: key,
        label: endpoint.label,
        modelId: endpoint.modelId,
        maxConcurrentQuestions: endpoint.maxConcurrentQuestions
      }))
    }
    return handlers.handle("list", () => Effect.succeed(listing))
  })
)

export const QuestionsApiLive = HttpApiBuilder.layer(PolicyHuisApi).pipe(
  Layer.provide(Layer.mergeAll(QuestionsLive, ModelsLive))
)
