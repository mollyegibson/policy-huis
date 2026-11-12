# PolicyHuis: Evaluation and Model Comparison Plan

Draft, November 11, 2026.

This plan lets one backend answer with either the local model or the frontier model, chosen per question; makes Claude the frontier model; adds a promptfoo evaluation in `evaluation/` that runs the question set against each model configuration with deterministic checks; and adds a model choice to the browser app. It ends with the open questions for energy, which the energy dashboard depends on and which this plan does not settle.

It starts from a measured failure. With the [Budget and Legislative Analyst report](sf-plan.md) loaded and listed in `search_policy`'s description, `gpt-oss:20b` at `reasoning_effort: low` answered "What share of San Francisco renter households were rent burdened in 2024?" without calling a tool in 7 of 7 runs through the backend and 3 of 3 against Ollama directly; its reasoning ("Need dataset. Maybe SF census? Not available.") looked only at the data tools. Rewording the tool description, adding a system prompt rule and `tool_choice: required` (which Ollama ignored) each changed 0 of 3 runs; `reasoning_effort: medium` searched in 1 of 3. Fixes like these need pass rates over many questions and repeated runs, and a comparison with a model that is not the bottleneck.

## Decisions

- **The model is chosen per question, not per backend.** `agent.yaml` lists the configurations a deployment offers; a question names one, or gets the default. Each configuration keeps its own admission limit, so a frontier question never waits behind a local one.
- **Claude replaces `gpt-6-luna` as the frontier configuration**, through Effect's first-party provider `@effect/ai-anthropic` (4.1.2, matching `effect` 4.1.2), not an OpenAI-compatible endpoint. The [MVP plan](mvp-technical-plan.md#backend-agent-service) preferred one provider package for every configuration, so that differences come from the model rather than the client, and allowed a configuration to fall back to its provider's first-party package; the frontier configuration now does. The like-for-like comparison of hardware stays between Local and Same model in the cloud, which both keep `@effect/ai-openai-compat`.
- **The model is `claude-opus-5-5`, at effort `low`.** It is the accuracy ceiling the frontier configuration stands for; `low` keeps cost and latency down and matches the local configuration's `reasoning_effort: low`.
- **The evaluation uses promptfoo**, MIT-licensed, actively released (0.125.1, October 25, 2026, on npm), and owned by OpenAI since March 2026, which [committed to keeping it open source](https://openai.com/index/openai-to-acquire-promptfoo/). It follows the shape of an earlier promptfoo evaluation by the same author: a custom provider, scenario YAML decoded with `Schema`, assertion functions applied in code, and `evaluate()` called from a CLI.
- **Checks are deterministic for now.** No LLM grader: the checks read the answer text, the tools called and the citations sent, and compare the answer with expected facts taken from the original sources. A model grader can be added later beside them.
- **The evaluation calls the running backend over its API**, with the real MCP servers and databases, not an in-process backend with mocked tools. What is under test is the agent choosing tools and citing passages from the real corpus.
- **Traces stay the record.** promptfoo keeps its own results for its viewer; every evaluation request also carries an evaluation run ID, which the backend writes to its trace, so the energy dashboard and any later report read `app`, never promptfoo's database.

## Step 1: Model configurations chosen per question

### `agent.yaml`

```yaml
model:
  default: local
  offered: [local, frontier] # each needs its API key in backend/.env, except local
  configurations:
    local:
      provider: openai-compat
      label: Open model on this computer
      baseUrl: http://localhost:11434/v1
      modelId: gpt-oss:20b
      # contextTokens, answerTokens, bytesPerToken, maxConcurrentQuestions, requestOptions as today
    frontier:
      provider: anthropic
      label: Frontier model in the cloud
      modelId: claude-opus-5-5
      effort: low
      contextTokens: 32000 # provisional: the local configuration's budget, so both answer under the same limit
      answerTokens: 4000 # provisional; includes thinking tokens
      bytesPerToken: 3 # provisional
      maxConcurrentQuestions: 4 # provisional, within the account's rate limits
```

- `model.configuration` (one configuration per backend) becomes `model.default` and `model.offered`. A configuration that is offered but has no API key fails startup with a `ConfigFileError`, as a selected one does today; a configuration that is listed but not offered needs no key.
- Each configuration gains `provider` and `label`. `AgentConfig.ts` decodes a configuration as a union on `provider`: `openai-compat` keeps `baseUrl`, `outputTokensParameter` and `requestOptions`; `anthropic` has `effort` and no base URL. The frontier entry's `outputTokensParameter: max_completion_tokens` and `reasoning_effort: none` go with `gpt-6-luna`.
- `FRONTIER_API_KEY` in `backend/.env` becomes an Anthropic API key; the variable keeps its name, by the existing `<CONFIGURATION>_API_KEY` rule.
- Claude Opus 5.5 always thinks; `effort` (`low`, `medium`, `high`, `xhigh`, `max`, default `medium`) is its only control, and `@effect/ai-anthropic` 4.1.2 accepts it in its `Config`. Refusal fallbacks to another model stay off: a fallback would answer with a model other than the one the trace names. A refusal finishes with reason `content-filter`, which the loop already reports as `ContentRefused`.

### Backend

| Module | Change |
|---|---|
| `model/ModelLayer.ts` | Becomes `ModelConfigurations`: for each offered configuration, a `LanguageModel` (through `@effect/ai-openai-compat` or `@effect/ai-anthropic`, by `provider`) and its admission semaphore. Still the only module that imports a provider package. |
| `agent/Agent.ts` | `ask` takes the configuration key, takes that configuration's permit, and provides that configuration's `LanguageModel` to the loop. An unknown or unoffered key fails before the stream starts. |
| `trace/` and `db/schema.ts` | `app.requests` gains `evaluation_run_id uuid` (nullable) and `model_settings jsonb` (the configuration's effort or request options, so a change of effort shows in the traces); `model_config` and `model_id` already exist. Regenerated with `db:generate`. |

**To verify on the first run against Claude**, with a test kept in the backend's suite: a two-step question with a tool call between the steps. Claude requires a turn's thinking blocks to come back unchanged in the next request. The loop builds the next prompt with `Prompt.fromResponseParts`, which keeps reasoning parts and their metadata, and `@effect/ai-anthropic` sends a reasoning part's signature back as a `thinking` block (both 4.1.2); the test confirms the pair works end to end. It also confirms the finish reasons the loop sees (`end_turn` → `stop`, `tool_use` → `tool-calls`, `max_tokens` → `length`, by the provider's mapping) and that the trace's output tokens include thinking.

### `protocol/`

- `QuestionRequest` gains `model` (optional; a configuration key) and `evaluationRunId` (optional UUID). A request naming a configuration that is not offered gets `400 UnknownModel` with the offered keys.
- `GET /api/v1/models` returns the offered configurations, in order, with each one's key, label and model ID, and which is the default; the browser app builds its model choice from it.
- `Complete` gains `model` (the configuration key and model ID that answered) and `usage` (input and output tokens), so the browser app labels each answer and the evaluation records tokens without reading the database.

## Step 2: The evaluation

### Layout

`evaluation/` becomes a TypeScript workspace, `@policyhuis/evaluation`. It is a client of the backend's API like the browser app, so it depends on `protocol/` to decode the event stream, and on nothing else in the repo.

```
evaluation/
  package.json
  .env.example            EVALUATION_BACKEND_URL, optional
  questions/
    sf.yaml               the San Francisco question set
  src/
    EvaluationConfig.ts   the one configuration module: the backend's URL
    Questions.ts          the question file's Schema, and loading it
    Answer.ts             the backend's events for one question, folded into an Answer
    BackendProvider.ts    the promptfoo provider: one question to the backend's API
    checks.ts             the checks, as functions of the answer
    suite.ts              each question's expectations as promptfoo assertions
    results.ts            the run's summary, from promptfoo's results.json
    runEval.ts            the CLI
  test/                   unit tests of the checks, the question file and the summary
  results/                one folder per run, never overwritten: promptfoo's results.json and results.html (gitignored)
```

`yarn workspace @policyhuis/evaluation eval [--model local,frontier] [--repeat 3] [--only sf-bla-01,sf-data-10]` runs the set against a backend already running (its URL from `evaluation/.env`, through `EvaluationConfig.ts`), with one provider per model configuration named (the backend's default when none is), checked against `GET /api/v1/models` before any question is asked. It then prints, for each configuration, each check's pass rate and each failing question's failed checks. `yarn workspace @policyhuis/evaluation promptfoo view` browses every run, each question's answers from every configuration side by side.

### The provider

`BackendProvider` is a promptfoo `ApiProvider`. For each question it posts `QuestionRequest`, decodes every server-sent event with `protocol`'s `AgentStreamEvent`, and folds them into an `Answer`: the text (the `TextChunk`s), each lookup (tool, arguments, outcome, result, error), the citations sent (`Sources`) and `Complete`'s request ID, outcome, message, unavailable servers, model and token usage. It sends the configuration as `model` and its run's `evaluationRunId` with every question, and returns the text as `output`, the `Answer` as `metadata.answer`, which the checks decode with `Schema`, and `Complete.usage` as `tokenUsage`.

The run ID is one UUID per configuration per run, matching the [Ubiquitous Language](../ubiquitous-language.md) entry: an evaluation run is one pass of the question set against one model configuration.

Questions run one at a time (`maxConcurrency: 1`), as the [MVP plan](mvp-technical-plan.md#question-set) requires for energy sampling, and because the local configuration answers one question at a time. Repeats use promptfoo's `repeat`. A result the provider could not get (the stream ended without `Complete`, a server was unavailable, the outcome was `failed`, or the backend answered `503 busy`) is a promptfoo error (`failureReason` 2), counted apart from passes and failures.

### The question file

`evaluation/questions/sf.yaml` holds the questions below. `Questions.ts` decodes it with `Schema`, and `suite.ts` turns each question's `expect` into promptfoo assertions (see [The checks](#the-checks)).

```yaml
questions:
  - id: sf-bla-01
    type: report
    question: "What share of San Francisco renter households were rent burdened in 2024?"
    expect:
      tools: [sf_docs_search_policy, sf_docs_get_provision] # at least one
      documents: [bla_affordable_housing] # the answer cites at least one passage of each
      mentions: [report, analysis] # at least one appears
      facts:
        - any: ["37%", "37 percent"] # at least one appears
          source: "bla_affordable_housing, Executive Summary, p. 1"
```

| Field | Meaning |
|---|---|
| `type` | A question type from [Provisional Questions](provisional-questions.md), plus `report`: answered from an analysis report on the docs server, with the answer saying it is analysis, not law |
| `expect.tools` | At least one of these tools is called |
| `expect.documents` | The answer cites a passage of each of these documents |
| `expect.provisions` | The answer cites one of these provisions, or a subsection of one |
| `expect.facts` | Each fact appears, in one of the listed forms. A fact is copied from the archived source and names where it is |
| `expect.notDocuments` | The answer cites no passage of these documents |
| `expect.arguments` | Some call of an expected tool has each of these arguments |
| `expect.mentions` | At least one of these words appears |
| `expect.citesNothing` | The answer contains no citation |

**Expected facts are quoted from documents, never computed or remembered.** A data question's figures (eviction counts, pipeline units) change with every load, and [CLAUDE.md](../../CLAUDE.md#data-provenance-mandatory) keeps computed counts out of docs and config, so data questions check that the right tool was called, and every question checks that each figure in the answer came from a tool result. Whether the tool computes the figure correctly is the data server's own tests' job. The one exception is a figure a publisher states as such: the Rent Board's allowable increase, quoted with its dataset version.

### The checks

Each check is a function of the `Answer` in `checks.ts`, run as a promptfoo `javascript` assertion named by its `metric`, except `citedExpectedDocuments` and `notCitedDocuments`, which are promptfoo's `contains` and `not-contains` on the citation prefix. promptfoo's built-in `icontains-any` was the first choice for facts and mentions, but it compares text as written, and `gpt-oss:20b` writes narrow no-break spaces (`1.6\u202f%`) and non-breaking hyphens (`rent\u2011controlled`); the checks compare after `normalizeText` instead. promptfoo's `trajectory:tool-used` and `trajectory:tool-args-match` check tool calls too, but read them from OpenTelemetry traces the target exports to promptfoo, which the backend does not.

A **citation marker** is anything in square brackets, as one token with a digit, `.` or `#` in it, that is not a Markdown link's text: a well-formed `[<citationId>]`, and also a mangled one, such as `[6b56a3fe0ccdd6cc]` (only the part after `#`), which `gpt-oss:20b` wrote on November 11, 2026.

| Check | Assertion | Passes when |
|---|---|---|
| `completed` | `javascript` | The outcome is `answered`, not `step_limit`, `context_limit` or `truncated` |
| `calledExpectedTool` | `javascript` | At least one tool in `expect.tools` was called |
| `calledWithArguments` | `javascript` | Some call of an expected tool has every argument in `expect.arguments`, compared without case |
| `citedExpectedDocuments` | `contains`, one per document | The answer contains `[sf_docs.<documentId>@` |
| `notCitedDocuments` | `not-contains`, one per document | The answer does not contain `[sf_docs.<documentId>@` |
| `citedExpectedProvisions` | `javascript` | The answer cites one of `expect.provisions`, or a subsection of one (`37.9(a)(8)(ii)` also matches `37.9(a)(8)(ii)(A)`, but `37.9` does not match `37.9A`) |
| `citationIdsExact` | `javascript` | Every citation marker in the answer is an ID the backend sent in `Sources` for this question, character for character, and no ID is written in other brackets (`gpt-oss:20b` writes `【…】`, which the browser app shows as text, not as a source) |
| `citesFigures` | `javascript` | An answer that states a figure, other than one the question states or a list's numbering, contains at least one citation marker. Where the citation sits (after each figure, at a table's caption, once for a paragraph) is the answer's presentation and is not checked; whether each figure came from the data is `figuresFromTools`'s |
| `figuresFromTools` | `javascript` | Every number in the answer, outside its citation markers and list numbering, appears in a tool call or result, a citation, or the question, compared as numbers (`10,100` matches `10100`), and read from number words in the results too, since the ordinance writes amounts in words ("one thousand dollars") |
| `expectedFacts` | `javascript` | Each fact appears in one of its forms, after `normalizeText` |
| `mentions` | `javascript` | One of the words appears, after `normalizeText` |
| `citesNothing` | `javascript` | No citation marker appears |

Every question gets `completed`, `citationIdsExact`, `citesFigures` and `figuresFromTools`; the others come from its `expect`. `figuresFromTools` runs on every question, not only data questions, because passages of the ordinance and the report come back in tool results too, so a figure the model invented in any answer is caught. The checks are tested on answers shaped like the ones the backend returned.

### The question set

**The BLA report.** Facts from the archived report (version 2026-06-05), at the pages its executive summary states them; the body repeats most of them, and any passage of the report counts as a citation. sf-bla-01 to sf-bla-03 are the questions `gpt-oss:20b` answered without a tool call on November 11, 2026.

| ID | Type | Question | Facts (each in at least one form) | Where |
|---|---|---|---|---|
| sf-bla-01 | report | What share of San Francisco renter households were rent burdened in 2024? | "37%" | p. 1 |
| sf-bla-02 | report | How far behind is San Francisco on its RHNA housing goals? | "82,069"; "46,598"; "12 percent" | p. 4 |
| sf-bla-03 | report | How much did MOHCD spend on multifamily affordable housing in FY 2024-25, and where did the money come from? | "$285.7 million"; "$234 million" | p. 5 |
| sf-bla-04 | report | How much revenue did the City lose from the 2023 reduction of impact fees and inclusionary requirements? | "$448,033"; "$1,902,077"; "$211,030" | pp. 11–12 |
| sf-bla-05 | report | How much does the temporary fee discount save a developer per unit? | "$16,433"; "0.44" and "1.83" | p. 13 |
| sf-bla-06 | report | How much public money would it take to meet San Francisco's affordable housing goals? | "$17.9 billion"; "$900,000" | p. 16 |
| sf-bla-07 | report | What financing tools has the Budget and Legislative Analyst suggested for affordable housing? | "revolving loan fund"; "joint powers"; "open indenture"; "municipal bank" | p. 23 |
| sf-bla-08 | report | What did the report recommend for extremely low-income housing? | "extremely low-income"; "Housing Trust Fund"; "floor" | p. 26 |
| sf-bla-09 | report | What is the current inclusionary housing requirement for rental projects? | "24 percent" or "24%"; "November 1, 2026" | p. 11 |

All nine expect a docs tool, a citation of `bla_affordable_housing`, and a mention of "report" or "analysis". sf-bla-09's good answer also says the inclusionary ordinance itself is not loaded, which no check reads.

**The rent ordinance.** The 50 questions of spike S4's set (`docs/plans/spikes/s4-questions.yaml`), in its order, with its grade-2 provisions, which were labeled from the loaded passages. Each question with provisions expects a docs tool, a citation of `rent_ordinance` and one of its provisions cited. The five that Chapter 37 does not answer expect a docs tool only: a good answer may cite the nearby provisions it checked while saying the ordinance does not cover the question, so whether it says so plainly is read by hand.

| ID | Question | Expected provisions |
|---|---|---|
| sf-rent-01 | Can my landlord kick me out so his daughter can move into my apartment? | `37.9(a)(8)(ii)` |
| sf-rent-02 | How much is my landlord allowed to raise the rent each year? | `37.3(a)(1)` |
| sf-rent-03 | My landlord is evicting me so he can move in himself. How much moving money do I get? | `37.9C(e)(1)` |
| sf-rent-04 | Can my landlord refuse to give me an extra key for my dog walker? | `37.13(b)(2)` |
| sf-rent-05 | What is a buyout agreement? | `37.9E(c)` |
| sf-rent-06 | What are the just causes for eviction under the Rent Ordinance? | `37.9(a)` |
| sf-rent-07 | What does the Rent Ordinance say about landlords using algorithmic rent-setting software? | `37.10C(b)` |
| sf-rent-08 | What information do property owners have to report to the Rent Board about their units? | `37.15(b)`, `37.15(b)(2)` |
| sf-rent-09 | How do capital improvement passthroughs work? | `37.7(a)` |
| sf-rent-10 | I signed a deal to take money and move out. Can I back out? | `37.9E(g)` |
| sf-rent-11 | My landlord stopped doing repairs and keeps coming into my place to pressure me to leave. Is that allowed? | `37.10B(a)(2)`, `37.10B(a)(4)` |
| sf-rent-12 | We just had a baby. Can our landlord charge more rent because there's another person living here now? | `37.3(a)(11)(A)` |
| sf-rent-13 | I'm 72 and have lived in my apartment for 15 years. Can the owner still make me leave so he can move in? | `37.9(i)(1)(A)` |
| sf-rent-14 | Can they evict my family in the middle of the school year? | `37.9(j)(1)` |
| sf-rent-15 | Our building was just sold. Can the new owner raise my rent or make me move? | `37.9(k)(2)(A)`, `37.9(k)(1)(A)` |
| sf-rent-16 | The bank foreclosed on my landlord. Do I have to move out? | `37.9D(b)` |
| sf-rent-17 | My lease says I have to be out when it ends in August. Do I really have to leave? | `37.9F(b)` |
| sf-rent-18 | My landlord is taking away my parking spot. Can he do that without lowering my rent? | `37.2(r)` |
| sf-rent-19 | My landlord evicted me to move in, then rented my old apartment to someone else. What can I do? | `37.9B(a)` |
| sf-rent-20 | My landlord says he's taking the whole building off the rental market. How much relocation money do I get? | `37.9A(e)(2)` |
| sf-rent-21 | I'm a small landlord and skipped rent increases for a few years. Can I add the ones I missed now? | `37.3(a)(2)` |
| sf-rent-22 | My landlord wants me out for a few months to redo the building. Do I get to move back in, and at what rent? | `37.9(a)(11)` |
| sf-rent-23 | Which newly built units are exempt from the rent increase limits? | `37.3(g)(1)` |
| sf-rent-24 | What penalties apply when a landlord fails to file statements of occupancy after an owner move-in eviction? | `37.9(a)(8)(vii)` |
| sf-rent-25 | What enforcement tools exist against landlords who harass tenants? | `37.10B(c)(5)`, `37.10B(c)(2)`, `37.10B(c)(1)` |
| sf-rent-26 | What happens to a landlord's ability to raise rents if they never send their unit info to the Rent Board? | `37.15(e)` |
| sf-rent-27 | My rent went up because of city bond costs on the property tax bill. Is that allowed, and can I get out of paying it? | `37.3(a)(6)(A)` |
| sf-rent-28 | Can my landlord evict me for complaining to the city about mold? | `37.9(d)` |
| sf-rent-29 | What disclosures must a landlord give tenants before starting buyout negotiations? | `37.9E(d)` |
| sf-rent-30 | I've been living in a motel room for over a month. Am I covered by rent control? | `37.2(r)(1)` |
| sf-rent-31 | Is it a crime for a landlord to charge more rent than the ordinance allows? | `37.10A(a)` |
| sf-rent-32 | Can my landlord keep my security deposit for normal wear and tear? | none: Chapter 37 does not answer it |
| sf-rent-33 | How do I register my apartment as a short-term rental on Airbnb in San Francisco? | none: Chapter 37 does not answer it |
| sf-rent-34 | What temperature does my landlord have to keep the heat at in winter? | none: Chapter 37 does not answer it |
| sf-rent-35 | Under what conditions may a landlord recover possession of a rental unit for occupancy by a relative? | `37.9(a)(8)(ii)` |
| sf-rent-36 | What reasons can my landlord legally use to evict me? | `37.9(a)` |
| sf-rent-37 | What is the rescission period for a buyout agreement? | `37.9E(g)` |
| sf-rent-38 | Is there a defense to a no-fault eviction when a child or an educator lives in the unit during the school year? | `37.9(j)(1)` |
| sf-rent-39 | When does an accommodation in a hotel or motel become a rental unit under the Rent Ordinance? | `37.2(r)(1)` |
| sf-rent-40 | Section 37.9C relocation expenses | `37.9C(b)`, `37.9C(e)(1)` |
| sf-rent-41 | Ellis Act relocation payments | `37.9A(e)(2)` |
| sf-rent-42 | Costa-Hawkins exemption from rent increase limits | `37.3(d)(1)(A)` |
| sf-rent-43 | capital improvement amortization schedules | `37.7(c)` |
| sf-rent-44 | I rent a single-family house in San Francisco. Is my rent controlled? | `37.3(d)(1)(A)` |
| sf-rent-45 | Is my in-law unit covered by rent control? | `37.2(r)(4)(D)` |
| sf-rent-46 | I'm a landlord and my tenant moved a roommate in without asking me. Can I evict them for that? | `37.9(a)(2)(A)`, `37.9(a)(2)(D)` |
| sf-rent-47 | My building's operating costs went up a lot. How can I raise rents more than the annual limit? | `37.8(b)(1)` |
| sf-rent-48 | Can I be evicted for rent I couldn't pay because of COVID? | `37.9(a)(1)(D)`, `37.9(a)(1)(E)` |
| sf-rent-49 | How much notice does my landlord have to give before coming into my apartment? | none: Chapter 37 does not answer it |
| sf-rent-50 | Can a landlord refuse to rent to me because I have a housing voucher? | none: Chapter 37 does not answer it |

**The data tools.** One question per `sf-data` tool. Each expects that tool; a neighborhood or year in the question is expected in the tool's arguments.

| ID | Type | Question | Expected tool | Expected arguments or facts |
|---|---|---|---|---|
| sf-data-01 | ground | How many eviction notices were filed in the Mission in 2025, and for what reasons? (SF-03, with the year stated) | `sf_data_eviction_notice_counts` | neighborhood `Mission`; months January to December 2025 |
| sf-data-02 | ground | What reasons can a landlord give on an eviction notice in San Francisco? | `sf_data_eviction_grounds` | |
| sf-data-03 | ground | How many affordable units are in the city's pipeline at each income level? (SF-04) | `sf_data_affordable_pipeline_units_by_income_band` | |
| sf-data-04 | ground | How many affordable housing projects in MOHCD's pipeline are under construction? | `sf_data_affordable_pipeline_summary` | |
| sf-data-05 | ground | Which affordable housing projects are planned in the Tenderloin? | `sf_data_affordable_pipeline_projects` | neighborhood `Tenderloin` |
| sf-data-06 | ground | How many net new units are in the development pipeline, by status? | `sf_data_development_pipeline_summary` | |
| sf-data-07 | ground | What are the largest housing projects under construction in South of Market? | `sf_data_development_pipeline_projects` | neighborhood `South of Market` |
| sf-data-08 | climate | Which affordable projects in San Francisco fall inside the sea-level-rise zone? (SF-08) | `sf_data_project_hazard_exposure` | zone `slr_66in_100yr_storm` |
| sf-data-09 | ground | Where does your eviction data come from, and how current is it? | `sf_data_dataset_info` | |
| sf-data-10 | ground | What was the allowable annual rent increase for rent-controlled units from March 1, 2026? | `sf_data_allowable_rent_increase` | fact "1.6%" or "1.6 percent": the Rent Board's figure for March 1, 2026 to February 28, 2027 (dataset `allowable_rent_increase`, version 2026-05-01) |

**Rule and data.**

| ID | Type | Question | Expected |
|---|---|---|---|
| sf-mix-01 | rule + data | Can my landlord raise my rent by 10%? | `sf_data_allowable_rent_increase` and a docs tool; citations of `rent_ordinance`; fact "1.6%" or "1.6 percent", as in sf-data-10; no citation of `bla_affordable_housing` |
| sf-mix-02 | rule + data | Which grounds for eviction in the rent ordinance account for the most notices, and which are rising? (SF-06) | `sf_data_eviction_notice_counts` and a docs tool; a citation of `rent_ordinance` |
| sf-mix-03 | rule | Which units are covered by rent control under Chapter 37 of the Administrative Code? (SF-01) | A docs tool; a citation of `rent_ordinance` |

**Declines.**

| ID | Type | Question | Expected |
|---|---|---|---|
| sf-decline-01 | decline | My landlord gave me a notice to pay rent or quit. Should I stop paying and fight it in court? | `mentions` "Rent Board"; it may explain the ordinance, with citations |
| sf-decline-02 | decline | Did rent control cause evictions in San Francisco to fall? | No figure without a citation (`citesFigures`) or from outside the tools (`figuresFromTools`); whether it avoids a causal claim is read by hand |
| sf-decline-03 | decline | How many eviction notices were filed in Oakland last year? | `citesNothing`; `mentions` "Oakland" |

That is 75 questions: 9 on the report, 50 on the ordinance, 10 on the data tools, 3 combining them and 3 declines.

## Step 3: The model choice in the browser app

- A model choice beside the question box, built from `GET /api/v1/models`, sent as `model` with each question and remembered per viewer in `localStorage`.
- Each answer is labeled with the configuration's label and model ID from `Complete.model`.
- **Compare**: one question sent to two configurations at once, the answers shown side by side, each with its lookups and sources. The local configuration's limit still applies: a second compare while one is answering gets the `busy` message on the local side.

The details go in the [Browser App Plan](browser-app.md).

## Step 4: Documentation

- [Agent Loop Plan](agent-loop.md): configuration table, startup, admission per configuration, API contract, `app` schema.
- [MVP Technical Plan](mvp-technical-plan.md): the frontier model and its provider package; S5's question about Chat Completions no longer applies to the frontier configuration.
- [Ubiquitous Language](../ubiquitous-language.md): Frontier now names Claude; add Check, Evaluation run ID and Compare.
- `CLAUDE.md`: `evaluation/` is a TypeScript workspace; `protocol/` is shared by the backend and its API clients, the browser app and the evaluation.
- [Provisional Questions](provisional-questions.md): the `report` question type.

## Energy and the dashboard: open questions

Energy is not in Steps 1 to 4, but these decide how it fits:

1. **Local measurement.** The MVP plan samples `powermetrics`, which needs sudo, net of an idle baseline. The backend should not run as root, so a separate privileged sampler would record samples that the backend or the evaluation joins to a request by time. Which one joins them, and where samples are stored, is open.
2. **Cloud estimates.** EcoLogits is Python and estimates from token counts and latency after the fact. Its coverage of Claude Opus 5.5, and its uncertainty for a closed model, are unchecked.
3. **Where estimates are stored.** `app` is the backend's schema, written by the backend through Drizzle. Options: the backend computes an estimate itself and writes it with the trace; a Python job writes to a table it owns, beside `app`; or the evaluation records energy with its results. Interactive questions, including Compare, are not sampled: their requests overlap.
4. **The dashboard** reads evaluation runs and traces through new read endpoints on the backend, as the MVP plan's follow-up describes, once 1 to 3 are settled.

## Open questions

1. **The context budget.** Holding Claude to the local configuration's 32,000 tokens keeps both under the same limit; Claude's own window is far larger. Kept equal until a question fails on it.
2. **Pass thresholds.** None for now: runs report pass rates; the evaluation is not a gate.
3. **Same model in the cloud** stays unconfigured until its provider is chosen (MVP plan, open question 3).
