# PolicyHuis: Evaluation and Model Comparison Plan

How PolicyHuis compares model configurations: one backend answers with the configuration each question names, a promptfoo evaluation in `evaluation/` runs the question set against each configuration with deterministic checks, and the browser app lets a viewer choose the model. Energy is planned separately, in the [Energy Estimates Plan](energy.md).

The evaluation exists because single-question fixes did not tell whether an answer improved: the small local model (`gpt-oss:20b`) answered questions about the loaded analysis report without calling a tool, whatever its tool description or system prompt said. Telling a fix from noise needs pass rates over many questions and repeated runs, and a comparison with a model that is not the bottleneck.

## Decisions

- **The open-weight model in the cloud is the main configuration.** `open_cloud` (Qwen3.5-397B-A17B through OpenRouter) is the backend's default, to show that an open-weight model is fit for the job; `frontier` (Claude Opus 5.5) is the comparison. `local` (`gpt-oss:20b` in Ollama) stays configured, not the default, as the reference for running on-premises. See the [MVP plan](mvp-technical-plan.md) for why the model is not run on the team's laptops.
- **The model is chosen per question, not per backend.** `agent.yaml` lists the configurations a deployment offers; a question names one, or gets the default. Each configuration keeps its own admission limit, so a question to one never waits behind another's.
- **Claude is the frontier configuration**, through Effect's first-party provider `@effect/ai-anthropic`, not an OpenAI-compatible endpoint. The [MVP plan](mvp-technical-plan.md#backend-agent-service) prefers one provider package for every configuration, so that differences come from the model rather than the client, and allows a configuration its provider's first-party package; the frontier configuration uses it. The open-weight configurations keep `@effect/ai-openai-compat`.
- **The model is `claude-opus-5-5`, at effort `low`,** the accuracy ceiling the frontier configuration stands for, with cost and latency kept down.
- **The evaluation uses promptfoo**, MIT-licensed and owned by OpenAI since March 2026, which [committed to keeping it open source](https://openai.com/index/openai-to-acquire-promptfoo/): a custom provider, a question file decoded with `Schema`, assertion functions applied in code, and `evaluate()` called from a CLI.
- **Checks are deterministic for now.** No LLM grader: the checks read the answer text, the tools called and the citations sent, and compare the answer with expected facts taken from the original sources. A model grader can be added later beside them.
- **The evaluation calls the running backend over its API**, with the real MCP servers and databases, not an in-process backend with mocked tools. What is under test is the agent choosing tools and citing passages from the real corpus.
- **Traces stay the record.** promptfoo keeps its own results for its viewer; every evaluation request also carries an evaluation run ID, which the backend writes to its trace, so any later report reads `app`, never promptfoo's database.

## Model configurations

The configurations are declared in [`backend/config/agent.yaml`](../../backend/config/agent.yaml) and decoded by `backend/src/config/AgentConfig.ts`; the [Agent Loop Plan](agent-loop.md#configuration) describes each field.

- `model.default` answers a question that names no configuration; `model.offered` lists the ones a question may name. An offered configuration without its API key (`<CONFIGURATION>_API_KEY` in `backend/.env`) fails startup with a `ConfigFileError`; one listed but not offered needs no key.
- A configuration is a union on `provider`: `openai-compat` has `baseUrl`, `outputTokensParameter`, `requireFirstLookup` (the first step must call a tool) and `requestOptions`, which carry settings such as OpenRouter's `reasoning: { effort }`; `anthropic` has `effort` and no base URL.
- Claude Opus 5.5 always thinks; `effort` is its only control. Refusal fallbacks to another model stay off, since a fallback would answer with a model other than the one the trace names. A refusal finishes with reason `content-filter`, which the loop reports as `ContentRefused`.
- `backend/src/model/ModelLayer.ts` builds, for each offered configuration, a `LanguageModel` and its admission semaphore; it is the only module that imports a provider package. `Agent.ask` takes the configuration's permit and provides its `LanguageModel` to the loop.
- `app.requests` records `model_config`, `model_id`, `model_settings` (the configuration's effort or request options) and `evaluation_run_id`.
- A two-step question with a tool call between the steps is tested against Claude: Claude requires a turn's thinking blocks to come back unchanged, which `Prompt.fromResponseParts` and `@effect/ai-anthropic` preserve.

The API side is in [`protocol/src/QuestionsApi.ts`](../../protocol/src/QuestionsApi.ts): `QuestionRequest` takes an optional `model` and `evaluationRunId`; `GET /api/v1/models` lists the offered configurations and the default; `Complete` carries the `model` that answered and the token `usage`.

## The evaluation

`evaluation/` is a TypeScript workspace, `@policyhuis/evaluation`, a client of the backend's API like the browser app: it depends on `protocol/` to decode the event stream, and on nothing else in the repo. Its files and commands are in its [README](../../evaluation/README.md).

`yarn workspace @policyhuis/evaluation eval [--model open_cloud,frontier] [--repeat 3] [--only sf-bla-01,sf-data-10]` runs the set against a running backend, with one provider per configuration named (the backend's default when none is), checked against `GET /api/v1/models` before any question is asked. It prints each configuration's pass rate per check and each failing question's failed checks; `promptfoo view` shows every run's answers side by side.

`BackendProvider` posts each question, decodes every server-sent event with `protocol`'s `AgentStreamEvent`, and folds them into an `Answer`: the text, each lookup, the citations sent and `Complete`'s fields. The run ID is one UUID per configuration per run: an evaluation run is one pass of the question set against one model configuration ([Ubiquitous Language](../ubiquitous-language.md)). Questions run concurrently, up to the smallest `maxConcurrentQuestions` among the chosen configurations, which `GET /api/v1/models` lists (`src/Concurrency.ts`). promptfoo's limit covers every configuration in a run together, so no configuration is asked more than it admits; a run that includes `local` asks one question at a time. Energy is estimated from token counts, so concurrency does not affect it. A result the provider could not get (the stream ended without `Complete`, a server was unavailable, the outcome was `failed`, or the backend answered `503 busy`) is a promptfoo error, counted apart from passes and failures.

### Question types

| Type | Answered from |
|---|---|
| `rule` | The docs server only |
| `ground` | A data server only |
| `rule + data` | Both: a rule from the docs server, numbers from a data server |
| `climate` | Mostly a data server, sometimes the docs server |
| `report` | An analysis report on the docs server, with the answer saying it is analysis, not law |
| `cross-city` | Both cities' servers |
| `decline` | None. The agent declines, explains why, and points to the right body or says what data is missing |

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
| `type` | A [question type](#question-types) |
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

Each check is a function of the `Answer` in `checks.ts`, run as a promptfoo `javascript` assertion named by its `metric`, except `citedExpectedDocuments` and `notCitedDocuments`, which are promptfoo's `contains` and `not-contains` on the citation prefix. Facts and mentions are compared after `normalizeText`, not with promptfoo's `icontains-any`, because models write narrow no-break spaces (`1.6\u202f%`) and non-breaking hyphens (`rent\u2011controlled`). promptfoo's `trajectory:tool-used` and `trajectory:tool-args-match` check tool calls too, but read them from OpenTelemetry traces the target exports to promptfoo, which the backend does not.

A **citation marker** is anything in square brackets, as one token with a digit, `.` or `#` in it, that is not a Markdown link's text: a well-formed `[<citationId>]`, and also a mangled one, such as `[6b56a3fe0ccdd6cc]` (only the part after `#`).

| Check | Assertion | Passes when |
|---|---|---|
| `completed` | `javascript` | The outcome is `answered`, not `step_limit`, `context_limit` or `truncated` |
| `calledExpectedTool` | `javascript` | At least one tool in `expect.tools` was called |
| `calledWithArguments` | `javascript` | Some call of an expected tool has every argument in `expect.arguments`, compared without case |
| `citedExpectedDocuments` | `contains`, one per document | The answer contains `[sf_docs.<documentId>@` |
| `notCitedDocuments` | `not-contains`, one per document | The answer does not contain `[sf_docs.<documentId>@` |
| `citedExpectedProvisions` | `javascript` | The answer cites one of `expect.provisions`, or a subsection of one (`37.9(a)(8)(ii)` also matches `37.9(a)(8)(ii)(A)`, but `37.9` does not match `37.9A`) |
| `citationIdsExact` | `javascript` | Every citation marker in the answer is an ID the backend sent in `Sources` for this question, character for character, and no ID is written in other brackets, which the browser app shows as text, not as a source |
| `citesFigures` | `javascript` | An answer that states a figure contains at least one citation marker. Numbers the question states, list and heading numbering, references to laws (`Section 415`, `§37.3(a)(1)`, `Chapter 37`) and decades (`1990s`) are not figures. Where the citation sits (after each figure, at a table's caption, once for a paragraph) is the answer's presentation and is not checked |
| `expectedFacts` | `javascript` | Each fact appears in one of its forms, after `normalizeText` |
| `mentions` | `javascript` | One of the words appears, after `normalizeText` |
| `citesNothing` | `javascript` | No citation marker appears |

Every question gets `completed`, `citationIdsExact` and `citesFigures`; the others come from its `expect`. Whether each figure came from a tool result is not checked: an answer may round a figure or compute one from the data (a total, a count), saying so with "about" or "roughly", and matching each such number to the data would take logic for rounding and arithmetic that could fail correct answers. The expected facts check the figures that matter most; other figures are read by hand. The checks are tested on answers shaped like the ones the backend returned.

### The question set

**The BLA report.** Facts from the archived report (version 2026-06-05), at the pages its executive summary states them; the body repeats most of them, and any passage of the report counts as a citation.

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
| sf-rent-02 | How much is my landlord allowed to raise the rent each year? | None: a docs tool or `sf_data_allowable_rent_increase`, since the ordinance's rule (`37.3(a)(1)`) and the current allowable increase both answer it |
| sf-rent-03 | My landlord is evicting me so he can move in himself. How much moving money do I get? | `37.9C(e)(1)` |
| sf-rent-04 | Can my landlord refuse to give me an extra key for my dog walker? | `37.13(b)(2)` |
| sf-rent-05 | What is a buyout agreement? | `37.9E(c)` |
| sf-rent-06 | What are the just causes for eviction under the Rent Ordinance? | `37.9(a)` |
| sf-rent-07 | What does the Rent Ordinance say about landlords using algorithmic rent-setting software? | `37.10C(b)` |
| sf-rent-08 | What information do property owners have to report to the Rent Board about their units? | `37.15(b)`, `37.15(b)(2)` |
| sf-rent-09 | How do capital improvement passthroughs work? | `37.7` or any of its subsections |
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
| sf-data-01 | ground | How many eviction notices were filed in the Mission in 2025, and for what reasons? | `sf_data_eviction_notice_counts` | neighborhood `Mission`; months January to December 2025 |
| sf-data-02 | ground | What reasons can a landlord give on an eviction notice in San Francisco? | `sf_data_eviction_grounds` | |
| sf-data-03 | ground | How many affordable units are in the city's pipeline at each income level? | `sf_data_affordable_pipeline_units_by_income_band` | |
| sf-data-04 | ground | How many affordable housing projects in MOHCD's pipeline are under construction? | `sf_data_affordable_pipeline_summary` | |
| sf-data-05 | ground | Which affordable housing projects are planned in the Tenderloin? | `sf_data_affordable_pipeline_projects` | neighborhood `Tenderloin` |
| sf-data-06 | ground | How many net new units are in the development pipeline, by status? | `sf_data_development_pipeline_summary` | |
| sf-data-07 | ground | What are the largest housing projects under construction in South of Market? | `sf_data_development_pipeline_projects` | neighborhood `South of Market` |
| sf-data-08 | climate | Which affordable projects in San Francisco fall inside the sea-level-rise zone? | `sf_data_project_hazard_exposure` | zone `slr_66in_100yr_storm` |
| sf-data-09 | ground | Where does your eviction data come from, and how current is it? | `sf_data_dataset_info` | |
| sf-data-10 | ground | What was the allowable annual rent increase for rent-controlled units from March 1, 2026? | `sf_data_allowable_rent_increase` | fact "1.6%" or "1.6 percent": the Rent Board's figure for March 1, 2026 to February 28, 2027 (dataset `allowable_rent_increase`, version 2026-05-01) |

**Rule and data.**

| ID | Type | Question | Expected |
|---|---|---|---|
| sf-mix-01 | rule + data | Can my landlord raise my rent by 10%? | `sf_data_allowable_rent_increase` and a docs tool; citations of `rent_ordinance`; fact "1.6%" or "1.6 percent", as in sf-data-10; no citation of `bla_affordable_housing` |
| sf-mix-02 | rule + data | Which grounds for eviction in the rent ordinance account for the most notices, and which are rising? | `sf_data_eviction_notice_counts`; the eviction data names each ground's section of the ordinance, so a citation of `rent_ordinance` is not required |
| sf-mix-03 | rule | Which units are covered by rent control under Chapter 37 of the Administrative Code? | A docs tool; a citation of `rent_ordinance` |

**Declines.**

| ID | Type | Question | Expected |
|---|---|---|---|
| sf-decline-01 | decline | My landlord gave me a notice to pay rent or quit. Should I stop paying and fight it in court? | `mentions` "Rent Board"; it may explain the ordinance, with citations |
| sf-decline-02 | decline | Did rent control cause evictions in San Francisco to fall? | No figure without a citation (`citesFigures`); whether it avoids a causal claim is read by hand |
| sf-decline-03 | decline | How many eviction notices were filed in Oakland last year? | `citesNothing`; `mentions` "Oakland" |

That is 75 questions: 9 on the report, 50 on the ordinance, 10 on the data tools, 3 combining them and 3 declines.

## The model choice in the browser app

See [Browser App Plan § Model choice](browser-app.md#model-choice): a model choice beside the question box, built from `GET /api/v1/models`, sent as `model` with each question and remembered per viewer; each answer is labeled with the configuration that answered. **Compare**, one question sent to two configurations at once with the answers side by side, is not built.

## Open questions

1. **The context budget.** The cloud configurations share a budget of 250,000 tokens, within Qwen3.5's 262,144 and Claude's 1M; the local configuration keeps 32,000, what Ollama holds on a laptop, so runs of the local configuration are not compared with the cloud runs under one limit. A prompt near the budget costs far more per step on Claude than on Qwen.
2. **Pass thresholds.** None for now: runs report pass rates; the evaluation is not a gate.
3. **The OpenRouter host.** OpenRouter routes each `open_cloud` request to one of several hosts, which may serve different quantizations, so answers can vary by host; pinning a host (OpenRouter's `provider` request option) is open.
4. **Reasoning effort.** `open_cloud` runs with reasoning off and `frontier` at `low`, so the comparison is between configurations as set, not at equal effort.
5. **Same model in the cloud** stays unconfigured; it would isolate the local hardware from the model, which matters only if the local configuration is evaluated again.
