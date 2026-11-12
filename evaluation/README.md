# Evaluation

Asks the running backend every question in the question set, through its API, and checks each answer with deterministic checks: the tools called, the citations, and expected facts copied from the original sources. Built on [promptfoo](https://www.promptfoo.dev/). The design, the checks and the questions are the [Evaluation and Model Comparison Plan](../docs/plans/evaluation.md).

| Path | Contents |
|---|---|
| `questions/sf.yaml` | The San Francisco question set: each question, its type and what its answer is checked for |
| `src/Questions.ts` | The question file's schema; an invalid file stops the run with the field to fix |
| `src/Answer.ts`, `src/BackendProvider.ts` | The promptfoo provider: one question to `POST /api/v1/questions`, its events folded into an `Answer` |
| `src/checks.ts`, `src/suite.ts` | The checks, and each question's expectations turned into promptfoo assertions |
| `src/results.ts`, `src/runEval.ts` | The CLI and the summary it prints |
| `src/EvaluationConfig.ts` | `EVALUATION_BACKEND_URL`, from `evaluation/.env` (default `http://localhost:3000`) |
| `results/` | One folder per run, never overwritten, named by its start (UTC) and the models asked: promptfoo's `results.json` and `results.html` (gitignored) |

## Run

Start the backend and the servers (`yarn dev --include san-francisco` from the repo root, with Ollama running for the `local` configuration), then:

```sh
yarn workspace @policyhuis/evaluation eval                      # every question once, with the backend's default model
yarn workspace @policyhuis/evaluation eval --model local,frontier   # every question with both models, side by side
yarn workspace @policyhuis/evaluation eval --repeat 3           # each question three times, for pass rates
yarn workspace @policyhuis/evaluation eval --only sf-bla-01,sf-data-10
yarn workspace @policyhuis/evaluation promptfoo view            # browse every run
```

`--model` takes the model configurations `backend/config/agent.yaml` offers (`GET /api/v1/models` lists them); each gets its own evaluation run ID, written to every trace it produces. Questions are asked one at a time. The run prints, for each configuration, each check's pass rate and each failing question's failed checks. A question the backend could not answer (a server unavailable, the model unreachable, `503 busy`) is an error, counted apart from passes and failures.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. The tests need no backend.
