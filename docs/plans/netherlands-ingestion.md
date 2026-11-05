# PolicyHuis: Netherlands Ingestion and Tools Plan

Draft, November 5, 2026.

How to load the Dutch data sources and then design the Dutch data server's tools, following the San Francisco build. The scope (which municipalities, which users, which questions) is set in [Netherlands Scope](../team-discussions/2026-11-03-netherlands-scope.md); the San Francisco build this follows is in the [San Francisco Plan](sf-plan.md).

## Summary

- **Copy the shape, not the code.** `netherlands/ingest/` follows `san-francisco/ingest/`: its own `.env`, `config/sources.yaml`, raw-schema migrations, dbt project and tests, depending on `shared/ingest` as a library.
- **Extend shared code; don't change it.** The shared library reads Socrata datasets (on any portal, given its domain) and ArcGIS layers only. Dutch source types it lacks are added to `shared/ingest` as new types, alongside the existing ones, without changing how the existing ones behave. See [Working in shared code](#working-in-shared-code).
- **National data is filtered at download.** Several Dutch sources are national. The filter to the chosen municipalities is declared in `sources.yaml` and becomes part of the download request, so the request recorded in the load manifest (`data_url`) shows exactly what was filtered.
- **Tools follow the data.** Once the data is loaded and modelled, the Dutch data server's tools are designed from the shape of that data and the Dutch questions, reusing the San Francisco patterns for citations, errors and tool design. See [Tool design](#tool-design).
- **Data sources first; laws and documents later.** Dutch laws and local regulations go through the shared legal-text pipeline, which does not exist yet, and depend on the translation and embedding spikes (S3, S4).

## What carries over unchanged

Read these first: [`san-francisco/ingest/`](../../san-francisco/ingest/README.md), [`shared/ingest/`](../../shared/ingest/README.md) and the Python and data provenance rules in [CLAUDE.md](../../CLAUDE.md).

| Piece | San Francisco | Netherlands |
|---|---|---|
| Project | `san-francisco/ingest/` | `netherlands/ingest/` |
| Neon project | `sf-housing` | Its own project, named with the data server |
| Raw schema | `raw_sf` | `raw_nl` |
| Modelled schema | `sf` | `nl` |
| Read-only role | `sf_housing_reader` | One for the Dutch data server |
| Settings | `san-francisco/ingest/.env` | `netherlands/ingest/.env`, with its own `.env.example` |
| Command | `sf-ingest` | Its own command, built the same way |

Every rule that applies to San Francisco applies here:

- **Public sources only.** No reuse permissions are sought; each source's license, or the absence of one, is recorded with the load.
- **Every load is archived and recorded.** The data file and its metadata go to object storage under their SHA-256; the manifest row and data rows are written in one transaction; unchanged data is skipped.
- **Raw rows are kept whole**, as `jsonb` keyed by the source's own field names, with geometry in EPSG:4326.
- **No values from memory.** Municipality codes, neighborhood codes and mappings come from a published source through a loader or a script, with the source recorded.
- **Rules live in code with tests.** A cleanup like San Francisco's neighborhood spelling rule is a dbt macro with a test, never a manual fix.
- **Dry run before Neon.** Load the real sources into a throwaway local PostGIS database and run `dbt build` before loading Neon, and record the database size.

## Steps

### Ingestion

1. **Source list.** For each source in the scope doc, record its publisher, access method (API, bulk file, map service), format, license or terms, update frequency, and size for one municipality and nationally. Check each fact at the source and note the date checked.
2. **Source types and filters.** From the list, decide which new source types `shared/ingest` needs and how each expresses a municipality filter in its download request.
3. **Shared code.** Add each new source type to `shared/ingest/src/policyhuis_ingest/source_types.py`, with tests using synthetic responses, as the existing Socrata and ArcGIS types have. Follow [Working in shared code](#working-in-shared-code).
4. **The Dutch project.** Create `netherlands/ingest/` from San Francisco's shape: settings, `sources.yaml`, migration `0001` for `raw_nl`, `nl` and the reader role, and the dbt project using the `policyhuis_macros` package.
5. **One municipality first.** Load and model one candidate municipality end to end, with dbt tests, before the team's municipality choice is final.
6. **Dry run, then Neon.** Run the local dry run, check sizes against the 1 GB project limit, then load the Neon project.

### Tools

7. **Questions to tools.** List the Dutch questions the data can answer, then the tools that answer them, following [Tool design](#tool-design). Add the tool list to this plan as a table (tool, answers, inputs, errors), as the San Francisco Plan's [Data server tools](sf-plan.md#data-server-tools) does, so the backend's system prompt and the evaluation set can be written against it.
8. **Schemas.** Write the tool schemas in the Dutch data server's code, with decode tests.
9. **Server.** Build the server once `shared/mcp-kit` and `san-francisco/housing-server/` exist to copy from, with tests through `McpTest`.

## Working in shared code

`shared/` is installed by every node, so a change there reaches San Francisco too. Keep shared changes to additions:

- **Add; don't modify.** New source types, new optional fields and new macros are additions. The behavior of existing source types, the load manifest's columns, the existing macros and the contract's existing fields stay as they are.
- **No city in shared code.** Portals, schema names, place names and codes belong in `netherlands/`. A test in `shared/ingest` fails if shared code names a city.
- **Run every node's tests.** After a shared change, run the tests in `shared/ingest` and in `san-francisco/ingest`; both must pass.
- **If an existing shared behavior has to change**, write down why in this plan's open questions instead of changing it, so both cities can plan for it.

## Tool design

The Dutch data server's tools are designed from the data it holds, not copied from San Francisco's: the Dutch sources, units of geography and questions are different. What is shared is how tools are built.

### Where the schemas go

| What | Where |
|---|---|
| The Dutch tools: names, parameters, results and descriptions | The Dutch data server's own code, for example `netherlands/<server>/src/Tools.ts`, as San Francisco's are in `san-francisco/housing-server/src/Tools.ts` |
| Helpers every TypeScript server can use: formats, the `UnknownValue` error, citation ID construction | `shared/mcp-kit/`, as an optional library |
| The citation schema the browser app decodes | `protocol/`. The Dutch server's citations must match it; it doesn't need to import it |
| A new citation field the Dutch data needs, such as a jurisdiction or a language and machine-translation label on document citations | `protocol/`'s citation schema, as an additive change: a new optional field or a new member of a union, never a change to an existing field |

Tool schemas stay in the server, because nothing else imports them: the backend discovers each server's tools over MCP at runtime, and the server publishes each tool's result shape as its `outputSchema`. The only shape other parts depend on is the citation, which the browser app decodes.

### Patterns shared with San Francisco

Follow these as the San Francisco Plan defines them; link to it rather than restating them in the Dutch code or docs:

- **Citations and their IDs**: every result carries its citations in `structuredContent`, matching `protocol/`'s citation schema, with a stable `sourceId` and `citationId` built from the citation's own fields. See [Protocol and shared helpers](sf-plan.md#protocol-and-shared-helpers).
- **How the model cites**: claims are marked with the full `citationId`; the backend passes results through unchanged, and the browser app links markers to citations. See [Citations in answers](sf-plan.md#citations-in-answers).
- **Tool errors**: returned as results (`failureMode: "return"`), with `UnknownValue` listing the valid values. See [Protocol and shared helpers](sf-plan.md#protocol-and-shared-helpers).
- **Tool design rules**: fixed, parameterized tools backed by tested dbt models; list and summary tools so the model never adds up numbers; filters rather than labels (as with "is it moving"); inputs validated against the loaded data; reading rules in tool descriptions; facts about the data as typed fields; the publisher's description through a `dataset_info` tool. See [Data server tools](sf-plan.md#data-server-tools).
- **Naming**: servers name tools without a prefix; the backend's server directory gives the Dutch server its prefix. See [Data server tools](sf-plan.md#data-server-tools).
- **Testing**: decode tests for every schema, and server tests through `McpTest` against a Postgres testcontainer. See [Testing](sf-plan.md#testing).
- **What the Netherlands adds to the contract**: a jurisdiction for servers covering several municipalities, and language labels for Dutch documents. See [How this extends to the Netherlands](sf-plan.md#how-this-extends-to-the-netherlands).

### Designing from the data

- **Start from the modelled tables.** Each dbt model in `nl` suggests a list tool and a summary tool; the questions decide which are worth having.
- **Use the data's own geography.** Municipality and neighborhood codes from CBS, for example, are tool inputs validated against a loaded reference table, the way San Francisco validates neighborhood names.
- **Keep sources apart unless they truly join.** San Francisco found that its two pipelines overlap only in part, and kept them as separate tools. Check join rates in the data before merging sources into one tool.
- **Mind the tool count.** Every tool the model sees costs tokens and makes choosing harder for a small model; spike S2 tests selection among about a dozen tools across all servers.

## Sources from the scope doc

Formats and access below are unverified until step 1; they are listed to show which may need a new source type.

| Source | Needed for | Likely access, to verify | Phase |
|---|---|---|---|
| CBS StatLine | Housing stock by owner and landlord type, by municipality and neighborhood | An OData API | Data |
| BAG (addresses and buildings) | Building age, for the climate layer | National data through PDOK map services; must be filtered to the municipality at download | Data |
| EP-Online | Energy labels, for the climate layer | An API, possibly needing a key | Data |
| Klimaateffectatlas | Heat stress and flood risk maps | Map layers; service type to check | Data |
| Open Council Information (*Open Raadsinformatie*) | Council meeting documents | Its own API | Documents, later |
| National law database (*Basis Wetten Bestand*) | National housing and rent law | XML | Legal text, later |
| Local regulations (lokaleregelgeving.overheid.nl) | Each municipality's housing ordinance | XML or web pages | Legal text, later |
| Regional housing deals (*woondeals*) | Housing targets per region and municipality | Likely PDF | Documents, later |
| Housing shortage figures; ABF Research | Shortage and forecast figures | Unknown; openness unconfirmed | To decide |

## Open questions

1. **Municipalities.** Which 2–3, by the scope doc's criteria? Until decided, one candidate is built end to end.
2. **Server name.** San Francisco's is `sf-housing`; the Dutch name follows once the tools are known.
3. **Size.** Do the climate and building sources for 2–3 municipalities fit one 1 GB Neon project, or do they need a second?
