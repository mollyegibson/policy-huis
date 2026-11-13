# Energy Estimates Plan

Draft, November 12, 2026. **On hold:** no energy is shown anywhere until the Sustainable AI Group answers our request for per-token energy factors (see [Waiting on CLEER](#waiting-on-cleer)). Steps 1 and 4 do not depend on the factors and can be built before then.

This plan estimates the energy each answer took, for the two cloud configurations: `open_cloud` (Qwen3.5-397B-A17B through OpenRouter) and `frontier` (Claude Opus 5.5). It shows the estimate under each answer in the browser app, and adds a dashboard tab that compares the two configurations over evaluation runs. It replaces the MVP plan's earlier choice of EcoLogits for cloud estimates.

## Decisions

Recorded November 12, 2026, by the San Francisco owner:

1. **One method for both configurations,** so a difference between them comes from the models, not from mixing methods.
2. **The method is CLEER** (Closed-model Latent Energy Estimation Range) from the [Sustainable AI Group](https://www.sustainableaigroup.com), applied to each answer's own token counts. Nothing is shown until its per-token factors are available; EcoLogits is not used in the meantime.
3. **Under each answer:** energy in watt-hours with a range, labelled as an estimate, with a link to how it is estimated. No carbon or water.
4. **The dashboard compares evaluation runs:** each configuration answers the same question set, so energy per question sits beside the pass rate on the same questions, as the MVP plan requires ("a lower energy figure is never shown without the quality it came with").
5. **The local configuration is out of scope** for now. Measuring it needs `powermetrics`, which needs sudo, through a separate privileged sampler that joins its samples to requests by time.

The results are reported whichever way they come out. The plan tests whether the open model uses less energy per answer; it does not assume so.

## Why CLEER, and why not yet

Checked November 12, 2026:

| | CLEER | EcoLogits |
|---|---|---|
| Qwen3.5-397B | Directly measured, on B300 GPUs at batch 384 ([data](https://github.com/sustainableaigroup/CLEER/tree/main/data/v1)) | Not listed; its parameter counts could be passed in |
| Claude Opus 5.5 | Not listed. Claude Opus 5 is, as a proxy estimate with confidence 0.467 | Listed, with its architecture marked unreleased and its active parameters guessed as a range ([models.json](https://github.com/genai-impact/ecologits/blob/main/ecologits/data/models.json)) |
| Input tokens | Counted: input energy per token from the slope of time-to-first-token against prompt length ([tech report](https://reports.sustainableaigroup.com/CLEER-Tech-Report), section 7) | Not counted: GPU energy depends on output tokens only ([methodology](https://ecologits.ai/latest/methodology/llm_inference/)) |
| Applicable to one answer's tokens | Not from published data: it publishes energy per session, without the token counts behind each session, and withholds per-token factors ([schema](https://github.com/sustainableaigroup/CLEER/blob/main/data/v1/schema.md), "What is deliberately absent") | Yes |
| License | Data CC BY-NC 4.0; methodology CC BY 4.0; code Apache-2.0 | MPL-2.0 |

Input tokens decide the choice. In the evaluation runs of November 12, 2026, an answer's input tokens were 25 to 39 times its output tokens over a run (`evaluation/results/*/results.json`, the `usage` of each answer), because every step resends the whole prompt with the tool results so far. A method that counts only output tokens leaves out most of the work, and its comparison then rests mostly on each model's active parameters, which for Claude are a guess.

## Waiting on CLEER

The San Francisco owner is asking the Sustainable AI Group for:

1. **Per-token factors** for Qwen3.5-397B and for Claude Opus 5.5, or Opus 5 until Opus 5.5 is added: Wh per uncached input token, per cached input token read, per cache write if it differs, and per output token, each with its standard deviation, on CLEER's facility basis (accelerator, host, idle and cooling).
2. **Whether reasoning tokens** take the output factor.
3. **A published, versioned source** for the factors, such as a release file in their repository or the planned CLEER Feed API, so the factors can be fetched by a script with a hash. Factors sent only by email could not meet the data provenance rules (see [Step 2](#step-2-factors)).
4. **Permission** to show the estimates in this non-commercial research prototype with attribution, under the data's CC BY-NC 4.0 license.

This plan is revisited when they answer.

## What an estimate covers

**Counted:** the model's own work answering the question, summed over every step of the agent loop, including the final turn after a step or context limit.

**Not counted,** and said so wherever an estimate is shown:

- embedding the search queries (`sf-docs` calls Qwen3-Embedding-4B through OpenRouter, a few dozen tokens a query);
- the MCP servers, the backend, the database and the network;
- the browser.

A failed answer still gets an estimate of the tokens it used, since the energy was spent.

## Method

For one answer, with the token counts the providers report summed over its steps:

```
energy (Wh) = uncached input tokens × f_input
            + cache-read tokens     × f_cache_read
            + cache-write tokens    × f_cache_write
            + output tokens         × f_output        (reasoning tokens included)
```

Each factor `f` is the model's mean and standard deviation from CLEER. The range shown is the mean ± 1 standard deviation of the sum, treating the factors' errors as fully correlated (so the deviations add), which is the cautious choice when their correlation is not published. Whether to show ±1 or ±2 deviations is [open question 2](#open-questions).

The estimate is computed when it is read, from the stored token counts and the factor set in force, rather than stored once. A new CLEER release then reapplies to every past answer, and each estimate names the factor release it used.

## Steps

### Step 1. Record the token split (independent of CLEER)

`app.requests` keeps only total input and output tokens. Effect's `Response.Usage` reports more: `inputTokens.uncached`, `cacheRead` and `cacheWrite`, and `outputTokens.reasoning`.

- `StepEnded` carries the step's full usage, and the trace sums each field over the steps.
- `app.requests` gains `input_uncached_tokens`, `cache_read_tokens`, `cache_write_tokens` and `reasoning_tokens`, nullable, since a provider may not report them (`drizzle-kit generate`).
- **To verify first:** which fields `@effect/ai-anthropic` and `@effect/ai-openai-compat` fill from Claude and from OpenRouter. OpenRouter reported `prompt_tokens_details.cached_tokens` and `completion_tokens_details.reasoning_tokens` in a test on November 12, 2026; whether the compat provider maps them is unchecked.
- **Prompt caching** is not requested by the backend for either configuration (Claude caches only when asked; some OpenRouter hosts cache on their own). Each step resends the whole prompt, so caching would lower both cost and energy; whether to enable it, and for both configurations alike, is [open question 3](#open-questions).

### Step 2. Factors

- A script, `backend/scripts/energy-factors.ts`, fetches a CLEER release from its published source, checks the release's SHA-256 against the one CLEER publishes, and writes `backend/config/energy-factors.json`: the source URL, release date, hash, methodology version, and for each model the four factors with their deviations. The file is never edited by hand.
- `backend/config/agent.yaml` names each configuration's factor model (`energy: { model: Qwen3.5-397B }`), a declared choice reviewed by pull request. A configuration without one, such as `local`, has no estimate. If CLEER covers Opus 5 but not Opus 5.5, using Opus 5 as a stand-in is that choice, and the estimate says so.
- `backend/src/energy/` holds the estimate: a pure function from token counts and factors to `{ meanWh, sdWh, factorRelease, factorModel }`, with tests pinning it to worked cases.

### Step 3. Under each answer

- `protocol`'s `Complete` event gains `energy`: the estimate, or `null` when the configuration has no factors. The backend computes it from the answer's usage when the answer ends.
- The browser app shows it in the answer's footer, for example "≈ 1.2 Wh (0.9–1.5), estimated", with a link to a short page that says what is counted, what is not, the method and the factor release. Nothing is shown when `energy` is `null`.
- A unit test covers the `null` case and the rounding.

### Step 4. Evaluation results in `app` (independent of CLEER)

The dashboard reads `app`, never promptfoo's database ([evaluation plan](evaluation.md#decisions)), but `app` holds no question IDs and no check results.

- `QuestionRequest` gains `evaluationQuestionId` (the question set's ID, such as `sf-rent-14`), written to `app.requests`.
- After a run, the evaluation posts each answer's check verdicts to a new endpoint, `POST /api/v1/evaluation-runs/{runId}/results`, stored in a new table, `app.evaluation_checks` (request ID, check name, pass, reason).
- Also stored per run: the question set's file hash and the evaluation code's commit, so the dashboard only compares runs over the same questions.

### Step 5. The dashboard tab

- **Read endpoints:** `GET /api/v1/evaluation-runs` (each run's configuration, model, prompt version, question set hash, date, question count) and `GET /api/v1/evaluation-runs/{runId}` (each question's outcome, check verdicts, tokens, latency and energy estimate).
- **The tab** (`browser-app`, beside the question page) picks one run per configuration, over the same question set, and shows:
  - energy per answer for each configuration (median and range across questions), beside the pass rate;
  - energy per passing answer, so a configuration that fails cheaply is not shown as efficient;
  - a table of questions with each configuration's outcome, tokens and energy;
  - the factor release, what is not counted, and the conditions that differ between the two configurations (see below).
- Runs with different prompt versions or question sets are not compared without saying so.

## What the comparison compares

The dashboard compares configurations, not bare models. As configured on November 12, 2026 (`backend/config/agent.yaml`):

| | `open_cloud` | `frontier` |
|---|---|---|
| Model | Qwen3.5-397B-A17B | Claude Opus 5.5 |
| Reasoning | Off (`effort: none`) | Low (`effort: low`) |
| First step | Must call a tool (`requireFirstLookup`) | Model's choice (Claude rejects a forced tool choice) |
| Context budget | 250,000 tokens | 250,000 tokens |
| Host | Routed by OpenRouter, not pinned | Anthropic |
| Factors' hardware | CLEER's measured serving setup, not OpenRouter's host | CLEER's proxy for Claude's serving |

The reasoning setting and the first step's tool choice differ, so a difference in energy is partly a difference in how much each model was asked to think. The dashboard shows these settings beside the results.

## Ubiquitous Language

Add to [Ubiquitous Language](../ubiquitous-language.md) when built:

- **Energy estimate:** the estimated facility energy of one answer, from its token counts and a factor release, with a range.
- **Energy factors:** per-token energy for one model from one CLEER release, with deviations.

## Open questions

1. **Opus 5.5.** If CLEER does not add it, is Opus 5 an acceptable labelled stand-in, or does the frontier configuration show no estimate?
2. **The range:** ±1 or ±2 standard deviations, and whether to treat the factors' errors as correlated.
3. **Prompt caching** for both configurations: it changes the energy and cost of every step, and should be on for both or neither when comparing.
4. **Reasoning effort:** run the comparison with both configurations at the same effort, or report as configured?
5. **The OpenRouter host:** CLEER measured Qwen3.5 on its own setup; OpenRouter's hosts may serve other quantizations on other hardware. Pinning a host narrows, but does not close, that gap.
6. **The local configuration,** measured with `powermetrics`, when the privileged sampler is designed.
7. **Commercial use:** CLEER's data is non-commercial only; if PolicyHuis becomes a company, the estimates need CLEER's written permission or another source.
