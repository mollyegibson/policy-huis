# PolicyHuis: Netherlands Ingestion and Tools Plan

How to load the Dutch data sources, design and build the Dutch data server, and register it with the agent, following the San Francisco build. Nothing under `netherlands/` exists yet; every `netherlands/…` path below is planned. The scope (which municipalities, which users, which questions) is set in [Netherlands Scope](../team-discussions/2026-11-03-netherlands-scope.md); the San Francisco build this follows is in the [San Francisco Plan](sf-plan.md).

## Summary

- **Copy the shape, not the code.** `netherlands/ingest/data/` follows `san-francisco/ingest/data/`: its own `.env`, `config/sources.yaml`, raw-schema migrations, dbt project and tests, depending on `shared/ingest` as a library.
- **Extend shared code; don't change it.** The shared library reads Socrata datasets (on any portal, given its domain), ArcGIS layers and PDF documents (one row per page of text) only. Dutch source types it lacks are added to `shared/ingest` as new types, alongside the existing ones, without changing how the existing ones behave. See [Working in shared code](#working-in-shared-code).
- **National data is filtered at download.** Several Dutch sources are national. The filter to the chosen municipalities is declared in `sources.yaml` and becomes part of the download request, so the request recorded in the load manifest (`data_url`) shows exactly what was filtered.
- **Tools follow the data.** Once the data is loaded and modelled, the Dutch data server's tools are designed from the shape of that data and the Dutch questions, reusing the San Francisco patterns for citations, errors and tool design. See [Tool design](#tool-design).
- **The server,** `nl-data`**, copies** `sf-data`**'s shape, and joining the agent is configuration.** The backend, the system prompt and the browser app name no city: adding the Dutch server is one entry in the backend's server directory, plus its place in the local run instructions. See [Server](#server) and [Registering with the agent](#registering-with-the-agent).
- **Data sources first; laws and documents later.** Dutch laws and local regulations get their own documents ingestion (`netherlands/ingest/documents/`) and docs server (`nl-docs`), with a schema and tools fitted to Dutch documents; San Francisco's passage pipeline is specific to its documents and is not shared. Both depend on the translation spike (S3); the embedding model is chosen in [spike S4](spikes/s4-embeddings.md#decision), and whether it suits Dutch text is still to test.



## What carries over unchanged

Read these first: `[san-francisco/ingest/data/](../../san-francisco/ingest/data/README.md)`, `[shared/ingest/](../../shared/ingest/README.md)` and the Python and data provenance rules in [CLAUDE.md](../../CLAUDE.md).


| Piece           | San Francisco                    | Netherlands                                                 |
| --------------- | -------------------------------- | ----------------------------------------------------------- |
| Project         | `san-francisco/ingest/data/`     | `netherlands/ingest/data/`                                  |
| Neon project    | `sf-data`                        | `nl-data`                                                   |
| Raw schema      | `raw_sf_data`                    | `raw_nl_data`                                               |
| Modelled schema | `sf_data`                        | `nl_data`                                                   |
| Read-only role  | `sf_data_reader`                 | `nl_data_reader`                                            |
| Settings        | `san-francisco/ingest/data/.env` | `netherlands/ingest/data/.env`, with its own `.env.example` |
| Command         | `sf-data-ingest`                 | `nl-data-ingest`, built the same way                        |


Every rule that applies to San Francisco applies here: public sources only, every load archived and recorded, raw rows kept whole, no values from memory, rules in code with tests, and a dry run on a throwaway PostGIS database before Neon. See [CLAUDE.md](../../CLAUDE.md#data-provenance-mandatory) and the `san-francisco/ingest/data/` [README](../../san-francisco/ingest/data/README.md).

## Steps



### Ingestion

1. **Source list.** For each source in the scope doc, record its publisher, access method (API, bulk file, map service), format, license or terms, update frequency, and size for one municipality and nationally. Check each fact at the source and note the date checked.
2. **Source types and filters.** From the list, decide which new source types `shared/ingest` needs and how each expresses a municipality filter in its download request.
3. **Shared code.** Add each new source type to `shared/ingest/src/policyhuis_ingest/source_types.py`, with tests using synthetic responses, as the existing Socrata, ArcGIS and PDF types have. Follow [Working in shared code](#working-in-shared-code).
4. **The Dutch project.** Create `netherlands/ingest/data/` from San Francisco's shape: settings, `sources.yaml`, migration `0001` for `raw_nl_data`, `nl_data` and the `nl_data_reader` role, and the dbt project using the `policyhuis_macros` package.
5. **One municipality first.** Load and model one candidate municipality end to end, with dbt tests, before the team's municipality choice is final.
6. **Dry run, then Neon.** Run the local dry run, check sizes against the 1 GB project limit, then load the Neon project.



### Tools

1. **Questions to tools.** List the Dutch questions the data can answer, then the tools that answer them, following [Tool design](#tool-design). Add the tool list to this plan as a table (tool, answers, inputs, errors), as the San Francisco Plan's [Data server tools](sf-plan.md#data-server-tools) does, so the evaluation set can be written against it.
2. **Schemas.** Write the tool schemas in the Dutch data server's code, with decode tests.



### Server

The Dutch data server, `nl-data`, copies the shape of `[san-francisco/mcp-servers/data/](../../san-francisco/mcp-servers/data/README.md)`; read its code before starting. Its short name is `nl_data`: the tool prefix, citation namespace, schemas, reader role, environment variables (`NL_DATA_…`) and package all use it.

1. **Workspace.** Create `netherlands/mcp-servers/data/` as `@policyhuis/nl-data-server`, with the same `package.json` scripts, `tsconfig.json` and dependencies as `sf-data`, at the versions `sf-data` uses, added with `yarn workspace … add`, never by editing `package.json` or `yarn.lock`. Add it to the root `package.json`'s `workspaces`. It depends on no other workspace but `shared/node-config`, and imports nothing from `protocol/`.
2. **Code**, one file per concern, as in `sf-data`: see the file table in its [README](../../san-francisco/mcp-servers/data/README.md). The helpers in `Formats.ts`, `Params.ts` and `ToolErrors.ts` are copied from `sf-data` and owned by this server from then on. `src/Citations.ts` builds `sourceId` as `nl_data.<datasetKey>@<version>`, and `src/NlDataServerConfig.ts` reads `NL_DATA_READER_DATABASE_URL` and `NL_DATA_PORT` (see [Effect Style § 13](../effect-style.md#13-read-the-environment-through-one-configuration-module)). The tests cover what `sf-data`'s do: every tool published with an `outputSchema` and a title, every citation decoded against the convention under the `nl_data` namespace, `UnknownValue` for an input outside the data, `null` treated as absent, and `DatabaseUnavailable` when the database is unreachable.
3. **Check**, from the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`, with Docker running for the tests. Then run the server against the Neon project with `yarn workspace @policyhuis/nl-data-server start`.



### Registering with the agent

1. **Server directory.** Add the server to `backend/config/servers.yaml`:
  ```yaml
      - name: nl-data
        label: NL Data
        url: http://localhost:<port>/mcp
        prefix: nl_data_
  ```
    The backend offers each tool to the model as `<prefix><tool name>`. A prefix is words of lowercase letters and digits, each followed by one underscore, and two servers may not share a name or a prefix; the backend refuses to start if they do. The browser app shows the label beside each of the server's lookups, with the tool's title. When the server runs on another machine, `url` is its address on the network between the nodes (see the [MVP Technical Plan](mvp-technical-plan.md)).
2. **Local run.** `yarn dev --include netherlands` starts every workspace with a `start` script under `netherlands/`, so the server needs no change to the `dev` script. Add its configuration and start command to the README's "Running locally" next to `sf-data`'s.
3. **Restart the backend.** It lists each server's tools when it connects, and does not notice a server's tools changing, so restart it after adding the server or changing its tools (see [agent-loop.md](agent-loop.md#mcp-connections)). The backend and the servers can start in any order: it retries a server it cannot reach.
4. **Try it end to end.** Ask a Dutch question in the browser app. The lookups should show the server's tools with their `NL Data` label and titles, the answer should carry citation chips that open the Dutch sources, and the trace should record the calls in `app.tool_calls`. Nothing else changes: the system prompt names no place, and a question about a place no server covers is answered as not covered.
5. **Tool count.** The model now sees both cities' tools on every question. Record the total with the tool list in step 7; the evaluation shows whether the model still picks the right tool among them.



## Working in shared code

`shared/` is installed by every node, so a change there reaches San Francisco too. Keep shared changes to additions:

- **Add; don't modify.** New source types, new optional fields and new macros are additions. The behavior of existing source types, the load manifest's columns, the existing macros and the contract's existing fields stay as they are.
- **No city in shared code.** Portals, schema names, place names and codes belong in `netherlands/`. A test in `shared/ingest` fails if shared code names a city.
- **Run every node's tests.** After a shared change, run the tests in `shared/ingest` and in every city's ingestion projects (`san-francisco/ingest/data`, `san-francisco/ingest/documents`); all must pass.
- **Plumbing, never contracts.** Shared code does work several nodes need done the same way; it never defines what one node publishes to another. Tool errors and citation shapes are conventions each server implements itself (see [Domain-Driven Design](../domain-driven-design.md#bounded-contexts)).
- **If an existing shared behavior has to change**, write down why in this plan's open questions instead of changing it, so both cities can plan for it.



## Tool design

The Dutch data server's tools are designed from the data it holds, not copied from San Francisco's: the Dutch sources, units of geography and questions are different. What is shared is how tools are built.

### Where the schemas go


| What                                                                                                                                | Where                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Dutch tools: names, parameters, results and descriptions                                                                        | The Dutch data server's own code, `netherlands/mcp-servers/data/src/Tools.ts`, as San Francisco's are in `san-francisco/mcp-servers/data/src/Tools.ts`                                                                          |
| The helpers: formats, `OptionalParam`, the tool errors and `withDataErrors`                                                         | Copied from `sf-data` into the server's own `src/`, and owned by it                                                                                                                                                             |
| The citation schema                                                                                                                 | The server's own `src/Citations.ts`, following the [citation convention](../domain-driven-design.md#conventions-between-servers-and-the-backend); the server imports nothing from `protocol/`                                   |
| A new citation field the Dutch data needs, such as a jurisdiction or a language and machine-translation label on document citations | An additive change to the convention: a new optional field in the convention's table, the backend's schema for reading it (`backend/src/loop/ToolResults.ts`) and `protocol/`'s `Citation`, never a change to an existing field |


Tool schemas stay in the server, because nothing else imports them: the backend discovers each server's tools over MCP at runtime, and the server publishes each tool's result shape as its `outputSchema`. The only shape other parts depend on is the citation, which the backend reads by the convention and sends to the browser app.

### Patterns shared with San Francisco

Follow these as the San Francisco Plan defines them; link to it rather than restating them in the Dutch code or docs:

- **Citations and their IDs**: every result carries its citations in `structuredContent`, by the [citation convention](../domain-driven-design.md#conventions-between-servers-and-the-backend), with a stable `sourceId` namespaced `nl_data.` and a `citationId` built from the citation's own fields, and a locator saying what the query selected. See [Citations and tool errors](sf-plan.md#citations-and-tool-errors).
- **How the model cites**: the backend gives the model a short key for each citation (`C1`, `C2`, …), expands the keys it writes back to full citation IDs, and sends the citations to the browser app as `Sources`. See [Citations in answers](agent-loop.md#citations-in-answers).
- **Tool errors**: returned as results (`failureMode: "return"`), with `UnknownValue` listing the valid values, and `DatabaseUnavailable` when the server cannot reach its database, which the backend treats as the server being unavailable. See [Citations and tool errors](sf-plan.md#citations-and-tool-errors).
- **Tool design rules**: fixed, parameterized tools backed by tested dbt models; list and summary tools so the model never adds up numbers; filters rather than labels (as with "is it moving"); inputs validated against the loaded data; reading rules in tool descriptions; facts about the data as typed fields; the publisher's description through a `dataset_info` tool. See [Data server tools](sf-plan.md#data-server-tools).
- **Naming**: servers name tools without a prefix; the backend's server directory gives the Dutch server its prefix. See [Data server tools](sf-plan.md#data-server-tools).
- **Testing**: decode tests for every schema, and server tests through `McpTest` against a Postgres testcontainer. See the `sf-data` [server README](../../san-francisco/mcp-servers/data/README.md).
- **What the Netherlands adds to the contract**: a jurisdiction for servers covering several municipalities, and language labels for Dutch documents. See [How this extends to the Netherlands](sf-plan.md#how-this-extends-to-the-netherlands).



### Designing from the data

- **Start from the modelled tables.** Each dbt model in `nl_data` suggests a list tool and a summary tool; the questions decide which are worth having.
- **Use the data's own geography.** Municipality and neighborhood codes from CBS, for example, are tool inputs validated against a loaded reference table, the way San Francisco validates neighborhood names.
- **Keep sources apart unless they truly join.** San Francisco found that its two pipelines overlap only in part, and kept them as separate tools. Check join rates in the data before merging sources into one tool.
- **Mind the tool count.** Every tool the model sees costs tokens and makes choosing harder; the evaluation measures tool selection across all servers.



## Sources

Checked by the Netherlands owner, as recorded in the team's source table. Sizes are not yet measured. Dates are as recorded; three (2025 and later than 2026) look mistyped and are [open question 3](#open-questions).


| Source                                         | Publisher                                                           | Access                                                                   | Format                | License   | Updated                                                     | Checked                                                                                             | Phase            |
| ---------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------- | --------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------- |
| CBS StatLine                                   | Centraal Bureau voor de Statistiek                                  | OData API                                                                | XML                   | CC BY 4.0 | Daily                                                       | 11/09/2026                                                                                          | Data             |
| BAG (*Basisregistratie Adressen en Gebouwen*)  | Kadaster                                                            | BAG API                                                                  | Varies                | CC BY 4.0 | Daily                                                       | 11/09/2025                                                                                          | Data             |
| PDOK (*Publieke Dienstverlening Op de Kaart*)  | Kadaster                                                            | ATOM, OGC API                                                            | Geospatial files      | CC BY 4.0 |                                                             | 11/09/2026                                                                                          | Data             |
| EP-Online                                      | Rijksdienst voor Ondernemend Nederland (RVO)                        | API with a key, which expires after a year unused                        | XML, CSV, XLSX        | CC BY 4.0 | Monthly for all labelled buildings; daily for label changes | 11/09/2026                                                                                          | Data             |
| Klimaateffectatlas                             | Stichting Climate Adaptation Services (CAS)                         | API endpoint; moving to an ORI API                                       | Geospatial files, WMS | CC BY 4.0 |                                                             | 11/09/2026                                                                                          | Data             |
| wetten.overheid.nl                             | Ministerie van Binnenlandse Zaken en Koninkrijksrelaties            | Search service                                                           | XML, RTF, TXT         |           | Daily                                                       | 10/17/2026                                                                                          | Documents, later |
| National law database (*Basis Wetten Bestand*) | KOOP (Kennis- en Exploitatiecentrum Officiële Overheidspublicaties) | XML; current laws on request, with a service to keep chosen laws updated | PNG, XML              |           | Daily                                                       | 11/09/2026; a download covering laws up to September 14, 2026 was provided, about 160 GB nationally | Documents, later |
| Regional housing deals (*woondeals*)           | Ministerie van Binnenlandse Zaken en Koninkrijksrelaties            | Data visualization service                                               |                       |           |                                                             | 11/09/2025                                                                                          | Documents, later |
| Housing shortage figures; ABF Research         | ABF                                                                 | Consulting service                                                       | None                  | None      |                                                             | 11/09/2026                                                                                          | To decide        |


Not yet checked: Open Council Information (*Open Raadsinformatie*, council meeting documents, its own API) and local regulations (lokaleregelgeving.overheid.nl, each municipality's housing ordinance).

## Draft questions

Draft questions for the Netherlands and across cities, taken from the project overview's examples (*Housing Policy AI: Project Overview and Open Questions*, October 5, 2026), pending review by the research team and the Netherlands owner. San Francisco's question set is `[evaluation/questions/sf.yaml](../../evaluation/questions/sf.yaml)`; each type is defined in the [evaluation plan](evaluation.md#question-types). The sources are candidates from the overview's dataset list.

### Amsterdam


| ID     | Type        | Question                                                                                  | Likely sources                                    |
| ------ | ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| AMS-01 | rule        | Who is eligible for a social-rent home under the 2024 housing ordinance?                  | Huisvestingsverordening Amsterdam 2024            |
| AMS-02 | rule        | Do I need a permit to split an apartment into two units?                                  | Huisvestingsverordening Amsterdam 2024            |
| AMS-03 | rule        | What did national rent law say before July 2024, and what changed?                        | Basis Wetten Bestand (version history)            |
| AMS-04 | ground      | How many social-rent homes are planned in Nieuw-West, and when?                           | Nieuwbouwplannen                                  |
| AMS-05 | ground      | What share of homes in each district is owned by housing corporations?                    | CBS StatLine                                      |
| AMS-06 | ground      | How many short-term rental listings are in Centrum?                                       | Inside Airbnb, Amsterdam                          |
| AMS-07 | rule + data | Is Amsterdam on track for the share of social-rent homes its construction plan targets?   | Woningbouwplan reports; Nieuwbouwplannen          |
| AMS-08 | climate     | How many homes in this neighborhood have energy label E or worse, and how old are they?   | EP-Online; BAG                                    |
| AMS-09 | climate     | Which neighborhoods with planned housing face high heat stress or flood risk?             | Nieuwbouwplannen; Klimaateffectatlas              |
| AMS-10 | climate     | What do Dutch building rules require for energy performance when a building is renovated? | National building regulations (source to confirm) |




### Cross-city


| ID   | Type       | Question                                                                                 | Likely sources                                                                   |
| ---- | ---------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| X-01 | cross-city | How do Amsterdam and San Francisco each decide who qualifies for affordable housing?     | Huisvestingsverordening Amsterdam 2024; SF eligibility rules (source to confirm) |
| X-02 | cross-city | Which city requires more affordable units in new construction, and how is that enforced? | SF Planning Code; Amsterdam source to confirm                                    |


The project overview notes these are the hardest type: the two systems use different concepts and income definitions, and the sources are in different languages.

### Declines


| ID   | Question                                                        | Expected behavior                                                                                             |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| D-01 | Did rent control reduce evictions?                              | Show the trend next to the rule; decline to conclude causation                                                |
| D-02 | Can my landlord evict me?                                       | Explain the rule; refer to the San Francisco Rent Board or the Huurcommissie; decline individual legal advice |
| D-03 | What is the typical rent for a specific apartment in Amsterdam? | Say unit-level rents for Amsterdam are not in the available data                                              |
| D-04 | Exactly how much rent does a two-bedroom in the Mission cost?   | Give the band (the Rent Board inventory reports rent in $250 bands) and say it cannot be more precise         |
| D-05 | How many people were evicted in the Mission last year?          | Report notices filed, and say notices are filings, not completed evictions                                    |


D-04 and D-05 are San Francisco declines not yet in `sf.yaml`. D-03 to D-05 are phrased from the project overview's description of answers the tool should not give; it gives no example questions for them.

## Open questions

1. **Municipalities.** Which 2–3, by the scope doc's criteria? Until decided, one candidate is built end to end.
2. **Size.** Do the climate and building sources for 2–3 municipalities fit one 1 GB Neon project, or do they need a second?
3. **Check dates.** BAG and the regional housing deals are recorded as checked on 11/09/2025, EP-Online on 11/09/2027 and the Klimaateffectatlas on 11/09/2028; to confirm with the Netherlands owner.

