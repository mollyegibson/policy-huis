import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { Clock, Console, Effect, FileSystem, Layer, ManagedRuntime, Schema } from "effect"
import { evaluate } from "promptfoo"

import { BackendClient, backendProvider } from "./BackendProvider.ts"
import { BackendConfig, EvaluationEnv } from "./EvaluationConfig.ts"
import { loadQuestions } from "./Questions.ts"
import { byProvider, formatSummary, ResultsFile, summarize } from "./results.ts"
import { testCaseFor } from "./suite.ts"

const QUESTIONS = fileURLToPath(new URL("../questions/sf.yaml", import.meta.url))
const RESULTS = fileURLToPath(new URL("../results", import.meta.url))

/**
 * The folder a run's results are written to, never reused: the run's start in UTC and the model configurations it
 * asked, such as `results/2026-11-11T22-05-31_local+frontier`.
 */
const runFolder = (startedAt: number, models: ReadonlyArray<string>): string =>
  `${RESULTS}/${new Date(startedAt).toISOString().slice(0, 19).replaceAll(":", "-")}_${models.join("+")}`

/** The command line was wrong, or promptfoo or its results file failed; `message` says which. */
export class EvaluationFailed extends Schema.TaggedError<EvaluationFailed>()("EvaluationFailed", {
  message: Schema.String
}) {}

const USAGE =
  "yarn workspace @policyhuis/evaluation eval [--model local,frontier] [--repeat N] [--only sf-bla-01,sf-data-10]"

const parseCommandLine = Effect.fn("runEval.parseCommandLine")(function* () {
  const { values } = yield* Effect.try({
    try: () =>
      parseArgs({
        options: {
          repeat: { type: "string", default: "1" },
          only: { type: "string" },
          model: { type: "string" }
        }
      }),
    catch: (error) => new EvaluationFailed({ message: `${String(error)}\nUsage: ${USAGE}` })
  })
  const repeat = Number(values.repeat)
  if (!Number.isInteger(repeat) || repeat < 1) {
    return yield* new EvaluationFailed({ message: `--repeat must be a whole number from 1; got ${values.repeat}` })
  }
  const list = (value: string | undefined) => value?.split(",").map((item) => item.trim())
  return { repeat, only: list(values.only), models: list(values.model) }
})

const ConfigLive = BackendConfig.layer.pipe(Layer.provide(EvaluationEnv.layer), Layer.provide(NodeServices.layer))

const main = Effect.gen(function* () {
  const { repeat, only, models } = yield* parseCommandLine()
  const { questions } = yield* loadQuestions(QUESTIONS)
  const unknown = (only ?? []).filter((id) => !questions.some((q) => q.id === id))
  if (unknown.length > 0) return yield* new EvaluationFailed({ message: `No such question: ${unknown.join(", ")}` })
  const selected = only === undefined ? questions : questions.filter((q) => only.includes(q.id))

  const fs = yield* FileSystem.FileSystem
  const runtime = yield* Effect.acquireRelease(
    Effect.sync(() => ManagedRuntime.make(BackendClient.layer.pipe(Layer.provide(ConfigLive)))),
    (runtime) => runtime.disposeEffect
  )

  const offered = yield* Effect.tryPromise({
    try: () =>
      runtime.runPromise(
        Effect.gen(function* () {
          const client = yield* BackendClient
          return yield* client.models.list()
        })
      ),
    catch: (error) => new EvaluationFailed({ message: `The backend did not list its models: ${String(error)}` })
  })
  const chosen = models ?? [offered.default]
  const notOffered = chosen.filter((key) => !offered.models.some((model) => model.configuration === key))
  if (notOffered.length > 0) {
    return yield* new EvaluationFailed({
      message: `Not offered by the backend: ${notOffered.join(", ")}; offered: ${offered.models.map((m) => m.configuration).join(", ")}`
    })
  }
  const providers = chosen.map((key) => {
    const modelId = offered.models.find((model) => model.configuration === key)?.modelId ?? "unknown"
    const evaluationRunId = crypto.randomUUID()
    return {
      label: `${key} (${modelId})`,
      evaluationRunId,
      provider: backendProvider(runtime, { model: key, evaluationRunId }, `${key} (${modelId})`)
    }
  })

  const folder = runFolder(yield* Clock.currentTimeMillis, chosen)
  if (yield* fs.exists(folder)) return yield* new EvaluationFailed({ message: `${folder} already exists` })
  yield* fs.makeDirectory(folder, { recursive: true })
  const resultsJson = `${folder}/results.json`
  const resultsHtml = `${folder}/results.html`

  for (const { label, evaluationRunId } of providers) {
    yield* Console.log(`${label}: evaluation run ${evaluationRunId}`)
  }
  yield* Console.log(
    `Asking ${String(selected.length)} questions, ${String(repeat)} time(s) each, of ${String(providers.length)} model configuration(s), one at a time`
  )
  yield* Effect.tryPromise({
    try: () =>
      evaluate(
        {
          description: `PolicyHuis San Francisco question set (${providers.map((p) => p.label).join(" vs ")})`,
          prompts: ["{{question}}"],
          providers: providers.map((p) => p.provider),
          tests: selected.map(testCaseFor),
          outputPath: [resultsJson, resultsHtml],
          writeLatestResults: true
        },
        { maxConcurrency: 1, repeat, cache: false, showProgressBar: true }
      ),
    catch: (error) => new EvaluationFailed({ message: `promptfoo failed: ${String(error)}` })
  })

  const written = yield* fs.readFileString(resultsJson)
  const results = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(ResultsFile))(written).pipe(
    Effect.mapError((error) => new EvaluationFailed({ message: `${resultsJson}: ${error.message}` }))
  )
  for (const { label, rows } of byProvider(results.results.results)) {
    yield* Console.log(`\n== ${label}\n${formatSummary(summarize(rows))}`)
  }
  yield* Console.log(
    `\nResults: ${resultsHtml}, or browse every run with: yarn workspace @policyhuis/evaluation promptfoo view`
  )
})

main.pipe(Effect.scoped, Effect.provide(NodeServices.layer), NodeRuntime.runMain)
