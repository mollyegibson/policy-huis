# PolicyHuis: San Francisco Plan

Draft, November 3, 2026.

This plan covers the San Francisco build: its sources, the San Francisco MCP servers, and the agent loop that every city's servers plug into. It builds on the [MVP Technical Plan](mvp-technical-plan.md), which remains the reference for the shared architecture (one agent, independent MCP servers, the shared contract, the data layer, the network, evaluation and energy). Where this plan is more specific, this plan wins for San Francisco.

## Summary

- **Users:** policy makers and residents. One answer style for now; the API is designed so an audience attribute can be added later without breaking callers.
- **First build:** the Rent Ordinance (San Francisco Administrative Code, Chapter 37) and the California tenant-protection statutes, with the Rent Board's Eviction Notices dataset. Then a climate pair: the city's affordable housing pipeline against two flood hazard maps.
- **Servers:** the shared legal-text server, run with a San Francisco corpus, and one San Francisco data server for the first build (see [Data servers](#data-servers)).
- **Data tools:** fixed, parameterized tools backed by tested queries. No free-form query tool.
- **Agent loop:** a custom multi-step loop over Effect's `Chat` and `LanguageModel`, streaming typed events to the API (see [Agent loop](#agent-loop)).

## What already exists in San Francisco

From the research report [*SF housing policy tools landscape*](../../research/reports/SF%20housing%20policy%20tools%20landscape.md) (November 3, 2026), which cites a source for each point:

- **No public tool answers San Francisco housing questions with citations that join the law, the city's housing data and climate risk.** That holds for policy makers and for residents.
- **Law:** the official code host (American Legal Publishing) offers keyword search only, and no chatbot covers the Rent Ordinance or the Planning Code. The closest prior work is the City Attorney's use of Stanford RegLab's STARA to scan the whole Municipal Code, which was internal and not about housing.
- **Data:** official housing data is plentiful (DataSF, Planning's Housing Dashboard, the pipeline reports, the Rent Board Housing Inventory), but none of it can be queried in plain language through an official tool.
- **City staff and AI:** about 30,000 city staff have had Copilot Chat since July 2025. The city's Generative AI Guidelines prohibit "relying on AI to review legal or regulatory issues" and treat summarizing policy-related data as higher risk. For policy makers, the tool must therefore present itself as cited research that a person checks, and it must do something general-purpose assistants already approved for staff cannot.
- **Climate:** the city's sea-level-rise and flood layers are open but dated, and each covers a different hazard. No public tool shows housing projects against them.
- **Residents:** tenants rely on people (Rent Board counselors, tenant organizations, the right-to-counsel program). No San Francisco agency or nonprofit runs a tenant AI tool. The clearest gap is telling a tenant which law covers their unit: the Rent Ordinance, the state Tenant Protection Act, or neither. The documented risks are procedural errors (wrong deadlines, wrong steps), which Stanford's Legal Design Lab finds do the most harm, and AI that presents legal information as legal advice.

These findings set requirements that run through this plan:

1. Every claim cites the provision or dataset behind it, with its version or as-of date.
2. Answers give legal information, not advice, and point to the Rent Board or a tenant organization for individual cases.
3. Every climate answer names the hazard map it used, with that map's date and limits.
4. Eviction answers say that notices are filings, not completed evictions.

## Users and questions

One answer style serves both audiences in the first build. The tools and citations are the same for both; what differs is the question.

| Type | Resident example | Policy maker example | Sources |
|---|---|---|---|
| Rule | "Can my landlord evict me to move in themselves, and what do they owe me?" (answered as information, with a referral) | "Which grounds for eviction does Section 37.9 allow?" | Chapter 37 |
| Rule (state) | "Does the state rent cap apply if my unit is under San Francisco rent control?" | "How does the Tenant Protection Act interact with local rent control?" | Civil Code sections from the Tenant Protection Act; Costa-Hawkins |
| Ground | "How many eviction notices were filed in my neighborhood last year?" | "Which eviction grounds account for most notices since 2020, by supervisor district?" | Eviction Notices |
| Rule + data | "What is an owner move-in eviction, and how common is it in the Mission?" | "Which just-cause grounds are rising, and what does the ordinance require for each?" | Chapter 37 and Eviction Notices |
| Climate | "Are new affordable buildings being built in flood-prone areas?" | "Which affordable pipeline projects fall in the 66-inch sea-level-rise and 100-year storm zone, and how many units at or below 50% of area median income?" | Affordable housing pipeline; flood maps |
| Decline | "Should I sign this buyout agreement?" | "Did the 2020 rent law changes reduce evictions?" | None: refer, or show the trend without a causal claim |

These extend the San Francisco questions in [Provisional Questions](provisional-questions.md) (SF-01, SF-03, SF-06, SF-08 and the decline set) and will be reviewed with whoever checks San Francisco answers (see [Open questions](#open-questions)).

### Leaving room for an audience attribute

The first request schema carries only the question. Adding an audience later is an additive change:

- The request gains an optional `audience` field (for example `resident` or `policy_maker`). Callers that omit it get today's behavior.
- The agent selects a system prompt variant by audience; prompts are versioned files, and each trace records the variant and version used.
- The evaluation set tags each question with its audience, so scores can be split by audience once the field exists.

Nothing in the first build branches on audience, so adding it touches the request schema, prompt selection and evaluation tagging only.

## Sources for the first build

Checked on November 3, 2026. DataSF moved from `data.sfgov.org` to `data.sf.gov`; old links redirect.

### Legal text

| Source | Publisher | Access and format | License or terms | As of | Notes |
|---|---|---|---|---|---|
| Rent Ordinance (Administrative Code, Chapter 37) | San Francisco Rent Board | PDF, [sf.gov](https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf), 146 pages, 27 sections (Sec. 37.1 to Sec. 37.16) | Not stated; see below | Amended through June 29, 2026 | The PDF states it is "not an official record" and that it reflects court decisions and state legislation the official record may not. A separate [list of amendments](https://media.api.sf.gov/documents/601_List_of_Ord_Amendments_6-29-26.pdf) is published alongside. |
| Official Administrative Code | American Legal Publishing, [codelibrary.amlegal.com](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-15928) | Web pages | City copyright; an archived code page requires the city's written permission to reproduce | Current | Cited as the official text; not loaded. |
| California Civil Code: Tenant Protection Act sections (1946.2, 1947.12, 1947.13) and the Costa-Hawkins Rental Housing Act (1954.50 and following) | California Legislature | Daily bulk database downloads at [downloads.leginfo.legislature.ca.gov](https://downloads.leginfo.legislature.ca.gov/) | To confirm | Daily | The exact sections loaded are corpus membership in `config/`. A 2025 bill (SB 522) proposed amendments to 1946.2 and 1947.12; whether it was enacted is unconfirmed, which is why every load records the version it took. |

**The Rent Ordinance text.** The proposal is to load the Rent Board's PDF, cite American Legal Publishing as the official text in every citation, and ask the City Attorney's office (or the Rent Board) about reuse in parallel. The city's older raw code files on GitHub ([SFMOCI/openlaw](https://github.com/SFMOCI/openlaw)) were last updated in April 2014, so they cannot serve as the source for current law.

The PDF's text extracts cleanly. Each section starts with a "Sec. 37.x" heading, and the pleading-paper line numbers (1 to 28) down each page are removed during extraction.

### Data

| Source | DataSF ID | License | Updated | Size and shape | Notes |
|---|---|---|---|---|---|
| Eviction Notices | [`5cei-gny5`](https://data.sf.gov/d/5cei-gny5) | ODC Public Domain (PDDL) | Monthly; rows updated November 3, 2026 | 49,034 notices filed January 2, 1997 to October 29, 2026; 21 ground flags per notice, block-level address, supervisor district, analysis neighborhood, point location | Notices filed with the Rent Board under Section 37.9(c). A notice is not an eviction. A notice can carry several grounds. A duplicate-row issue was fixed on February 27, 2024. |
| MOHCD Affordable Housing Pipeline | [`aaxw-2cb8`](https://data.sf.gov/d/aaxw-2cb8) | PDDL | Quarterly; rows updated May 21, 2026 | 190 projects; status, units by bedroom count and by income level (20% to 150% of area median income), neighborhood, district, latitude and longitude | |
| 100-year storm + 66 inches of sea-level rise | [`6ann-usi8`](https://data.sf.gov/d/6ann-usi8) | **None listed on DataSF**; attributed to BCDC | Rows updated February 25, 2020 | Multipolygon | From BCDC's Adapting to Rising Tides program; 66 inches of sea-level rise plus a 100-year storm equals 108 inches of total water level. Used instead of the 108-inch zone *line* (`92e4-7ptg`), which is a boundary line and cannot answer whether a point is inside the zone. |
| SFPUC 100-Year Storm Flood Risk Zone | SFPUC [FeatureServer](https://services.arcgis.com/Zs2aNLFN00jrS4gG/ArcGIS/rest/services/FloodMap/FeatureServer/1); also on DataSF | PDDL for the DataSF copy (per its catalog record); not stated on the FeatureServer | Last edited July 1, 2022; version adopted September 25, 2018 | One polygon | Stormwater flooding only, not Bay or ocean flooding. SFPUC updates the map annually by July 1, so a newer version may exist on [sfpuc.org](https://sfpuc.org/learning/emergency-preparedness/flood-maps). |
| Analysis Neighborhoods | [`p5b7-5n3h`](https://data.sf.gov/d/p5b7-5n3h) | PDDL | October 17, 2023 | 41 neighborhoods | The boundaries the Eviction Notices dataset assigns neighborhoods from. Also the source of valid neighborhood names for tool inputs. |

**Hazard maps answer different questions.** The sea-level-rise layer is an extreme planning scenario: the city's disclaimer for its 108-inch zone calls that scenario "very, very unlikely", and the modelling rests on 2010 ground conditions. The SFPUC map covers stormwater only. Tools return results per map, with each map's name, date and limits, and never merge them into one "flood risk" answer.

### Mapping eviction grounds to the ordinance

The dataset names each ground in words ("owner move in", "Ellis Act withdrawal") but does not give the Section 37.9 subsection it corresponds to. Linking a ground to its subsection is what makes rule-plus-data answers possible, so the mapping is a declared table in `config/`, with a source cited for each row (for example, the Rent Board's eviction notice form or its annual eviction report), reviewed by pull request and pinned by a test. It is not written from memory. Grounds the dataset marks as "other cause" map to no subsection.

## Data servers

**Recommendation: one San Francisco data server (`sf-data`) for the first build**, holding the eviction, pipeline and flood data in one schema.

The climate question needs a spatial join: which pipeline projects fall inside which hazard polygon. Done in the database, that join is one tested query with PostGIS. Split across a housing server and a climate server, the model would have to carry each project's coordinates from one server's result into another server's call, which a small model does unreliably and which no test can pin.

The split is revisited when a climate source covers places beyond San Francisco (for example, national flood maps for several cities, or the Netherlands' national climate layers). A climate server then answers by location for any city, and the city data servers call it at load time, not through the model.

**Neon layout**, following the scope proposal's one-account, project-per-part approach:

| Neon project | Holds |
|---|---|
| `sf-legal-text` | Chapter 37 and the California sections: passages, embeddings, search indexes |
| `sf-data` | Eviction notices, the affordable pipeline, flood layers and neighborhoods, with PostGIS |
| `app` | Traces and evaluation results (shared with every city) |

Neon supports both extensions needed: PostGIS (3.5.7 on Postgres 17) and pgvector (0.8.0 on Postgres 17), per [Neon's extension list](https://neon.com/docs/extensions/pg-extensions).

## Data server tools

Fixed tools, each backed by a tested dbt model or query, prefixed `sf_`. The legal-text server adds its three tools (`sf_search_policy`, `sf_get_provision`, `sf_list_versions`), for nine in total, which spike S2 tests for tool selection.

| Tool | Inputs | Returns |
|---|---|---|
| `sf_eviction_notice_counts` | Date range (months); optional grounds, neighborhood, supervisor district; group by up to two of ground, neighborhood, district, year, month | Counts per group, the period covered, the data's as-of date, and caveats: notices are not evictions; a notice can carry several grounds, so counts by ground do not sum to the total |
| `sf_eviction_grounds` | None | Each ground: its label, its column, and its Section 37.9 subsection where the mapping has one |
| `sf_affordable_pipeline_projects` | Optional status, neighborhood, district, minimum units | Projects with name, status, units by income level, and location |
| `sf_affordable_pipeline_summary` | Group by status, neighborhood, district or income level | Unit totals per group |
| `sf_pipeline_flood_exposure` | Hazard map (`slr_66in_100yr_storm` or `sfpuc_100yr_storm`); optional status | Projects inside that map's zone with their units by income level, plus the map's name, date, source and limits |
| `sf_dataset_info` | Optional dataset | Each dataset's source, license, as-of date, archived file hash and caveats, for "how current is this?" questions |

**Inputs are validated against the data.** Neighborhood names, districts and ground names are checked against the loaded reference tables, and an unknown value returns a typed error listing the valid values, so the model can correct itself.

**Typed tool errors** (returned as results): `NoDataForPeriod`, `UnknownNeighborhood`, `UnknownGround`, `PeriodOutOfRange` (with the dataset's covered range).

**Citations.** Every result carries the citation objects from the shared contract: dataset name and ID, publisher, as-of date, archived file hash, the tool's query description, and for flood results the hazard map's own citation.

## Agent loop

The agent service (`apps/agent/`) runs a custom multi-step loop. Effect's `LanguageModel.streamText` resolves one round of tool calls per request and has no step limit or loop of its own, so the loop that calls the model, runs tools, and calls the model again until it answers is ours.

### Shape

```
HTTP request (question)
  → prepare turn: fresh per-request state, Chat seeded with the system prompt and question,
    toolkit merged from every server in the directory
  → runAgentLoop: forked fiber writing AgentStreamEvents to a queue
  → stream consumer: events → server-sent events to the caller, trace rows to `app`
```

### `runAgentLoop`

An `Effect.fn` that takes the `Chat`, the toolkit and the initial prompt, and returns `Stream<AgentStreamEvent>`.

1. Create a `Queue` of `AgentStreamEvent`, and fork the loop into the request's scope with `Effect.forkScoped`, so it ends with the request.
2. Each step:
   1. Snapshot the chat history, so a failed step can be rolled back.
   2. Call `chat.streamText({ prompt, toolkit })` for one model turn plus tool resolution.
   3. For each streamed part:
      - `text-delta` → offer `TextChunk`.
      - `tool-call` → record that the step had tool calls; offer `ToolStart` with the call ID, tool name and arguments; record the call in the per-request state.
      - `tool-result` → collect the citation objects in the result into the per-request citation registry; offer `ToolEnd` with the call ID, name and a size-limited result.
      - `finish` → add the token usage to the per-request state.
   4. Bound each step with a timeout from config, so a stalled model stream fails the step instead of holding the request open.
   5. If the step failed with a recoverable model error (`AiError`, such as malformed tool-call arguments or a transient provider error), restore the history snapshot and continue with a synthetic user message describing the error, up to a retry limit from config. Other errors fail the loop.
   6. If the step had no tool calls, the model has answered: stop. Otherwise continue with `Prompt.empty`, so the history (now holding the tool results) is the whole context, and count the step.
3. Stop at `maxSteps` from config. If the limit is reached before the model answers, the final event says the answer is incomplete.
4. On every exit path (answer, step limit, error or defect), emit `Complete` with the accumulated usage and citations before ending the queue, so the consumer always records usage. Errors end the queue with `Queue.fail` and defects with a die, so the stream terminates in every case.

This follows Effect 4's API: `Queue` with `Queue.end` and `Queue.fail` replaces Effect 3's `Mailbox`, and `Stream.fromQueue` turns it into the returned stream.

### Per-request state

A `Context.Service` holding a `Ref` of the turn's state, provided fresh for each request:

| Field | Purpose |
|---|---|
| `toolCalls` | Every call with its name, arguments, result size, latency and error, for the trace |
| `citations` | Citation objects from tool results, keyed by an ID the model uses to refer to them |
| `usage` | Input and output tokens summed across steps |
| `steps` | Steps taken |

A `Ref` rather than fiber-local state, because tool handlers can run on forked fibers and their updates must be visible to the loop.

### Events

| Event | Fields | Sent to the caller as |
|---|---|---|
| `TextChunk` | text | Answer text as it streams |
| `ToolStart` | call ID, tool name, arguments | "Searching the Rent Ordinance…" style status |
| `ToolEnd` | call ID, tool name, result summary | Status update; full results stay in the trace |
| `Complete` | usage, citations, whether the answer is complete | The final citation list and usage |

The events are `Schema` classes in the shared contract, so the API's server-sent event schema and the web app decode the same shapes.

### Citations in answers

The system prompt tells the model to mark each claim with the ID of a citation it received from a tool (for example `[c3]`). After the answer completes, the agent checks every marker against the citation registry:

- a marker with no matching citation is removed and recorded in the trace as an invalid citation;
- the `Complete` event carries only citations the answer actually used.

The evaluation scores answers on these trace fields, along with claims that carry no citation at all.

### Tool results

Every toolkit handler is wrapped so that:

- a defect or framework error in a handler becomes a failed tool result the model can read, instead of crashing the stream;
- a result larger than a configured byte limit is replaced with a message saying it was too large and how to narrow the request (results are never cut in half, since a truncated table looks complete).

### Model and toolkit

- **Model:** `LanguageModel` from `effect/ai`, provided by one layer chosen in config (local runtime, same model in the cloud, or frontier), as in the MVP plan. The loop never imports a provider package.
- **Toolkit:** for each server in the directory file, `McpClient.toolkit` binds that server's tools under its prefix; the agent merges the toolkits for the request. A server that is unreachable at the start of a request is left out, and the trace and the `Complete` event say which.
- **Configuration** (`config/agent.yaml`): `maxSteps`, step timeout, error retry limit, tool result byte limit, system prompt file and version. These are declared choices with no source to derive them from, so they live in config and are reviewed by pull request.

### Testing

- **Loop:** `@effect/vitest` tests with a scripted `LanguageModel` stub (a tool call, then an answer; a malformed call, then recovery; never answering, to hit the step limit), checking the event sequence and that `Complete` is always emitted.
- **Servers:** `McpTest.makeClient` from `effect/ai` runs a server's registrations in memory, through the same JSON-RPC encoding as the HTTP transport, against a Postgres testcontainer.
- **Citations:** unit tests for marker validation against the registry.

## API contract

One endpoint in the agent service's `HttpApi`:

- `POST /questions` with `{ question }`: a non-empty string with a maximum length set in config.
- The response is a server-sent event stream of the events above, ending with `Complete`.
- Requests are stateless: each question is answered on its own.

The request and event schemas live in `packages/contract/`. The contract carries a version, and changes within a version are additive only, such as the optional `audience` field described above.

## Pipelines for San Francisco

Python (`pipelines/`), following the provenance rules in [CLAUDE.md](../../CLAUDE.md):

| Loader | Archive | Raw tables | Notes |
|---|---|---|---|
| Rent Ordinance PDF | The PDF, with its SHA-256 | `raw_sf.rent_ordinance_pages` | Source version is the "amended through" date printed in the PDF |
| California statutes | The bulk database file | `raw_sf.ca_code_sections` | Only sections listed in `config/` are loaded; source version is the bulk file's date |
| DataSF datasets | Each full export (CSV or GeoJSON) | One `raw_sf` table per dataset | Source version is the dataset's `rowsUpdatedAt` |
| SFPUC flood map | GeoJSON export of the FeatureServer layer | `raw_sf.sfpuc_flood_zone` | |

dbt models in the `sf` schema:

- `eviction_notices`, plus `eviction_notice_grounds` (one row per notice and ground);
- `eviction_grounds`, joining the config mapping of grounds to subsections;
- `affordable_pipeline`;
- `flood_zones`, one row per hazard map with its metadata;
- `pipeline_flood_exposure`, the spatial join, with tests pinning known projects inside and outside each zone.

The passage pipeline splits Chapter 37 at "Sec. 37.x" headings and then at subsections, and the California sections at section and subdivision, keeping each passage's section number, version and source. The San Francisco corpus is English, so no translation step runs.

## How this extends to the Netherlands

The San Francisco build sets patterns that the Dutch product reuses unchanged:

- **Jurisdiction in every citation and tool.** Citations carry a jurisdiction, and tools take one, so a server covering several municipalities (as the Dutch data server will) needs no new contract.
- **Language in every citation.** San Francisco citations are English; Dutch ones carry the original language and a machine-translation label.
- **One legal-text codebase.** The Dutch corpus is another instance, with the translation step added to its passage pipeline.
- **Data servers by source, with the place as a parameter**, rather than one server per city, once more than one place shares a source.
- **The agent loop and API are place-independent.** Adding the Netherlands adds servers to the directory file.

## Milestones

| Milestone | Done when |
|---|---|
| SF0. Sources confirmed | Reuse terms asked of the city for Chapter 37; California bulk download terms checked; license for the sea-level-rise layer confirmed with DataSF or BCDC; SFPUC checked for a flood map newer than 2022; the grounds-to-subsections mapping sourced. |
| SF1. Contracts | Citation, jurisdiction, tool error, request and event schemas in `packages/contract/`; the San Francisco tool schemas defined and reviewed against the questions above. |
| SF2. First pair loaded | Chapter 37, the California sections and Eviction Notices loaded with provenance; dbt models and tests pass. |
| SF3. First cited answer | The agent loop, the San Francisco legal-text server and `sf-data` answer a rule-plus-data eviction question through `POST /questions`, with a trace in `app`. |
| SF4. Climate pair | The affordable pipeline and both flood maps loaded; `sf_pipeline_flood_exposure` answers the climate questions with each map named. |
| SF5. Evaluation | The San Francisco questions run against the three model configurations, with answers checked by the San Francisco reviewer. |

## Open questions

1. **Chapter 37 reuse.** What does the city allow for loading and quoting the Rent Ordinance text? Until it answers, should the demo quote the text, or show only section numbers and links?
2. **California statutes terms.** Confirm the reuse terms for the Legislature's bulk downloads.
3. **Sea-level-rise layer license.** DataSF lists no license for `6ann-usi8`, which is attributed to BCDC.
4. **Who checks San Francisco answers?** The research team is focused on the Netherlands. A reviewer with San Francisco housing-law knowledge is needed for the evaluation set, ideally from a tenant organization or a policy office.
5. **Data server split.** This plan recommends one `sf-data` server for now; confirm, or split housing and climate from the start.
6. **Jurisdiction identifiers.** Which scheme identifies jurisdictions in the contract? Open Civic Data division IDs are a candidate for the United States; the Dutch side needs a scheme that covers municipalities.
7. **Rent Board Housing Inventory.** Add it as the next San Francisco dataset, for "is my unit covered" and rent-band questions?

## References

- Research report: [SF housing policy tools landscape](../../research/reports/SF%20housing%20policy%20tools%20landscape.md), November 3, 2026
- Rent Ordinance (Rent Board copy): <https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf>
- Rent Ordinance amendments list: <https://media.api.sf.gov/documents/601_List_of_Ord_Amendments_6-29-26.pdf>
- San Francisco Administrative Code (official): <https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-15928>
- SFMOCI openlaw repository: <https://github.com/SFMOCI/openlaw>
- California Legislature bulk downloads: <https://downloads.leginfo.legislature.ca.gov/>
- DataSF: Eviction Notices <https://data.sf.gov/d/5cei-gny5>; MOHCD Affordable Housing Pipeline <https://data.sf.gov/d/aaxw-2cb8>; 100-year storm + 66 inches SLR <https://data.sf.gov/d/6ann-usi8>; Analysis Neighborhoods <https://data.sf.gov/d/p5b7-5n3h>
- SFPUC flood maps: <https://sfpuc.org/learning/emergency-preparedness/flood-maps>
- Neon Postgres extensions: <https://neon.com/docs/extensions/pg-extensions>
