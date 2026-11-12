# PolicyHuis: Restructuring Plan

Draft, November 10, 2026; carried out November 11, 2026. Starts from commit `eecb55a`.

This plan reorganizes the repository by deployable unit, renames the San Francisco servers and their schemas, removes the package that coupled independent nodes through shared contracts, and replaces the citation and streaming contracts. Each step ends with lint, typecheck and tests passing for every project it touches. Steps 2 to 4 are done as one stretch: names, prefixes and `.env` files change in Step 2, but the databases only in Step 4, so the system does not run end to end in between.

## Decisions

- **Layout by deployable unit, then by domain.** Ingestion runs as scheduled jobs with write access; MCP servers run as long-lived services with read-only roles. They are never deployed together, so they live apart: `san-francisco/ingest/{data,documents}` and `san-francisco/mcp-servers/{data,documents}`.
- **Server names by kind of source.** `sf-data` serves datasets; `sf-docs` serves laws, reports and reference documents. Each server's short name (`sf_data`, `sf_docs`) is the same in every identifier: server name, tool prefix, citation namespace, schema, reader role, environment variables, package and module names. Directories keep the full words (`data`, `documents`), since `ingest/docs/` would read like a documentation folder, and so do the labels shown to users ("SF Data", "SF Documents"). The Dutch servers follow as `nl-data` and `nl-docs`.
- **No shared passage pipeline.** The documents schema and the pipeline that writes it (provision tree, (a)/(1)/(A)/(i) nesting, search entries) are specific to San Francisco's documents, so they move into San Francisco's documents ingest. The Dutch documents get their own schema and pipeline.
- **Shared code is plumbing, never a contract.** A library under `shared/` may do work several nodes need done the same way: reading configuration (`shared/node-config`), fetching, archiving and loading sources (`shared/ingest`). It may not define what one context publishes to another: tool errors, citation shapes, tool results. Those are conventions, documented in the plans, that each node implements in its own code and tests against. So `shared/mcp-kit` goes: its tool errors and citation builders are published contracts.
- **Servers do not import `protocol/`.** `protocol/` is the contract between the backend and the browser app only. Servers follow the documented citation convention, each with its own schema and a test that its citations conform; the backend reads citations from tool results and sends them to the browser in its own events.
- **Tool calls are lookups in the API.** "Step" already means a model turn, in the backend and in the API's `step_limit` outcome, so the events for a tool call are `LookupStarted` and `LookupEnded`, and "step" keeps its one meaning.
- **Servers namespace their own citation IDs** (`sf_data.…`, `sf_docs.…`). The backend does not rewrite tool results; the model sees each result as the server sent it.
- **Fresh databases and migrations.** New Neon projects are created, and each ingest project gets a new raw-SQL `0001`. Deleting applied migrations is safe here only because every database they ran on is replaced; the append-only rule in `CLAUDE.md` holds for the new migrations from their first application. The old Neon projects, and the source files archived in their object storage, are kept until the new loads are checked. The `app` schema does not change, so `backend/drizzle/` is untouched; the `app` Neon project is recreated too, since its traces use the old tool names and citations, and the backend applies its unchanged migration at startup.

## Step 1: Delete the spike code

- Delete `san-francisco/legal-text/spikes/`, `tests/test_s4_*.py` and the `voyage_api_key` setting.
- In [Spike S4](spikes/s4-embeddings.md), note that the harness is at commit `eecb55a`, and that `scoring.py` (hit@k, nDCG, MRR, bootstrap intervals, McNemar) and `cache.py` are reusable for the Amsterdam embedding spike.

## Step 2: Move and rename

No change in what is computed; the names the model sees change.

| From | To | Package or command |
|---|---|---|
| `san-francisco/ingest/` | `san-francisco/ingest/data/` | `sf-data-ingest`, module `sf_data_ingest` |
| `san-francisco/legal-text/` and `shared/legal-text/pipeline/` | `san-francisco/ingest/documents/` (the pipeline as a subpackage, its tests merged in) | `sf-docs-ingest`, module `sf_docs_ingest` |
| `san-francisco/housing-server/` | `san-francisco/mcp-servers/data/` | `@policyhuis/sf-data-server` |
| `san-francisco/legal-text-server/` | `san-francisco/mcp-servers/documents/` | `@policyhuis/sf-docs-server` |

- Move with `git mv` so history follows. `san-francisco/ingest/` moves through a temporary name, since it becomes its own parent.
- Fix paths one level deeper: uv path sources, the dbt `packages.yml`, and each `tsconfig.json`'s `extends`.
- Regenerate lockfiles with `uv lock` and `yarn install`; update the root `workspaces`.
- `scripts/dev.ts` selects a group's workspaces with `<group>/**`, since `*` does not cross `/` and the servers are now two levels down; a test pins that `--include san-francisco` selects both servers.
- Rename environment variables: `SF_HOUSING_*` to `SF_DATA_*`, `SF_LEGAL_TEXT_*` to `SF_DOCS_*`, and each `.env.example` with them.
- `backend/config/servers.yaml`: `sf-data` (label "SF Data", prefix `sf_data_`) and `sf-docs` (label "SF Documents", prefix `sf_docs_`). Neither prefix starts the other.

## Step 3: Remove `mcp-kit`

- Copy into each server only what it uses: the formats, `OptionalParam`, the tool errors and `withDataErrors`. `IsoDate` is defined in each server, not re-exported from `protocol/`.
- `datasetCitation` and `queryKey` move into the data server.
- `yarn remove @policyhuis/mcp-kit` in both servers; delete `shared/mcp-kit/` and its workspace entry.

## Step 4: Rename the schemas with fresh migrations

| Project | New `0001` creates |
|---|---|
| `ingest/data` | `raw_sf_data` (the manifest and every raw table, including the eviction tables), the `sf_data_reader` role |
| `ingest/documents` | `raw_sf_docs`, `sf_docs` (documents, passages with `summary`, search entries), the `sf_docs_reader` role |

- Delete the old `0001` and `0002` in both projects.
- dbt builds the `sf_data` schema (models directory and `generate_schema_name`); every source and model reads `raw_sf_data`.
- The servers' repos, reader roles and test fixtures (`sf_data.sql`, `sf_docs.sql`) follow.
- **Database owner:** create the `sf-data` and `sf-docs` Neon projects, set the `.env` files, then run `alembic upgrade head`, the ingest commands, `dbt build` and `passages`; create a new `app` Neon project and set `APP_DATABASE_URL` in `backend/.env`. Figures quoted in the plans (1,917 projects, 727 passages, 49,159 notices) are rechecked after the fresh loads. A source whose live file differs from the one archived in the old project (the pipeline's quarter, the Rent Ordinance PDF) is noted in the plan that quotes it. The old projects are deleted once the new loads are checked.

## Step 5: Citations and the API contract

### Servers

Each server defines its own citation schema in its `Tools.ts`, following one convention: every tool's `structuredContent` has a top-level `citations` array, declared in the tool's `outputSchema`, of:

| Field | Meaning |
|---|---|
| `citationId` | `<sourceId>#<part>`, where `<part>` is letters, digits and `_ . ( ) -` |
| `sourceId` | `<namespace>.<key>@<version>`, such as `sf_docs.rent_ordinance@2026-06-29`, where the namespace is the server's short name and the key and version are letters, digits and `_ . ( ) -`; the same for every citation of one source version |
| `title`, `publisher`, `sourceUrl`, `version` | The source, as shown to the user |
| `locator` | Optional. What part of the source the claim rests on, in words: a provision ("Sec. 37.9(a)(8)") or page for a document; a description of the selection for a dataset ("Planning pipeline projects with status BP Filed in the Mission"). Built from the source's fields and the tool's parameters only, so the same query always gets the same locator |
| `quote` | Optional. The cited text, verbatim |

- How each server builds the part after `#` is its own choice (a provision, or a query key).
- Each server's tests decode every citation its tools return against the convention, including the ID patterns and that every `citationId` starts with its `sourceId`.
- Tool errors follow one convention too: a server whose own database cannot be reached fails the call with `DatabaseUnavailable`. The backend treats it, like a transport failure, as the server being unavailable; the model still receives the error as a tool result.
- The tool name and parameters behind a dataset citation stay in the trace and in `LookupStarted`, not in the citation.
- Each tool carries a `Tool.Title` annotation, the title shown for its lookup. `McpServer` publishes it as the MCP tool's `annotations.title`.
- Both servers drop their `@policyhuis/protocol` dependency.

### `protocol/`

- One `Citation` schema replaces `LegalCitation` and `DatasetCitation`.
- `ToolStart` and `ToolEnd` are replaced by:
  - `LookupStarted`: lookup ID, source (name and label), tool, title, the tool's arguments;
  - `LookupEnded`: lookup ID, outcome (`succeeded`, `failed` or `unavailable`), its result (the tool's `structuredContent`, on success; otherwise null) and its error type (on failure; otherwise null);
  - `Sources`: lookup ID, citations.
- `TextChunk`, `Keepalive` and `Complete` are unchanged.

### Backend

- Builds each server's toolkit with `trustAnnotations: true`, so `McpClient` copies each tool's `annotations.title` into `Tool.Title`; lookup titles come from it. The read-only and destructive hints it also copies are not used.
- Decodes `structuredContent.citations` with its own schema and emits `Sources`. Citations that do not decode are logged and traced; a repeated `citationId` with different content is logged, and the first is kept.
- Maps a lookup's outcome from the error type `errorType` in `ToolResults.ts` already reads (a client error's reason, or the `_tag` of a server's tool error): `unavailable` for `TransportError`, `ClosedError` and `DatabaseUnavailable`, each of which also lists the server in `Complete.unavailableServers`; `failed` for any other error.
- The model receives each tool result unchanged.
- The trace is unchanged: `tool_calls.result` already stores each `structuredContent`.

### Browser app

- `QuestionState` reduces the new events.
- Each lookup's row shows its source label and title, expanding to its arguments from the start and its result or error type once it ends, as the tool-call rows do now.
- `result` is opaque to the browser: decoded as `Schema.Unknown` and shown only as formatted JSON. Citations come only from `Sources`, never from a result.
- `Sources.tsx` renders the shared fields: source, version and link, then each citation's `locator` and `quote`.
- `toolLabels.ts` is deleted; labels and titles arrive from the backend.
- Fixtures follow.

The system prompt is unchanged: markers keep the `<sourceId>#<part>` form.

## Step 6: Documentation

| Document | Changes |
|---|---|
| `CLAUDE.md` | Project table, test-container note, remove the `mcp-kit` and `shared/legal-text` rows; the rule that shared code is plumbing, never a contract; the fresh-migration exception as a one-time event |
| `README.md` | Layout and running locally |
| `docs/domain-driven-design.md` | Contexts by deployable unit, grouped by city; shared code as plumbing; the citation and tool-error conventions in place of the shared schema |
| `docs/ubiquitous-language.md` | Data server, docs server, lookup, source, locator |
| `docs/plans/mvp-technical-plan.md` | Layout; remove "one codebase, run once per corpus" and the shared passage pipeline |
| `docs/plans/sf-plan.md` | Names, schemas, prefixes, the citation convention, tool code |
| `docs/plans/agent-loop.md` | Events, outcomes, `trustAnnotations`, Citations in answers |
| `docs/plans/browser-app.md` | Events, lookup rows, sources display |
| `docs/plans/netherlands-ingestion.md` | Paths, no `mcp-kit`, `nl-data` and `nl-docs` |
| `docs/effect-style.md` | Its `mcp-kit` references |
| `docs/plans/spikes/s4-embeddings.md` | Paths and the harness note |

Research notes are left as written, as a record of their time.

## Follow-ups

Not part of this restructure:

1. **Search settings in the database.** The documents pipeline writes the embedding model and build to a one-row table in `sf_docs`, which the server reads at startup instead of its own `search.yaml` copy.
2. **Schema snapshots as the contract.** Each ingest project generates its schema's DDL, a test fails when it is stale, and its server's tests load it in place of hand-written fixtures.
3. **Backend citation prefixing**, only if citation IDs collide across servers.
4. **Deployment:** Dockerfiles for each server, and the ingest projects as Kubernetes cron jobs.
5. **Spike S2 after Step 5:** run S2's tool-selection and citation-copying checks, never run so far, with the new tool names and citation IDs.
