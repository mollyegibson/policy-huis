# PolicyHuis: Amsterdam Implementation Plan

- **Status:** draft, for review. Scope settled on **Amsterdam**; the rest of the plan is open to revision.
- **Companions:** [Netherlands Ingestion and Tools Plan](./netherlands-ingestion.md) (the build plan this makes concrete), [Netherlands Scope](../team-discussions/2026-11-03-netherlands-scope.md) (the scope proposal), [San Francisco Plan](./sf-plan.md) (the patterns copied), [MVP Technical Plan](./mvp-technical-plan.md) (the shared architecture).

This plan turns the Netherlands build plan into a file-by-file implementation plan against the San Francisco code. Nothing under `amsterdam/` exists yet; every path below is planned.

## Settled scope

| Decision | Settled value | Note |
|---|---|---|
| Dutch city | **Amsterdam** | Reverses the scope proposal's preference for 2–3 mid-size municipalities |
| Users | Policy makers and residents | Settled with the scope; the project overview's framing |
| Answer language | English answers, Dutch sources | Dutch documents translated once at load; citations quote the Dutch original and label machine translation |
| Model | Existing open model, no training | GPT-NL remains a candidate if access, license and size check out |
| Data hosting | Free Neon plan, one project per part | `ams-data`, `ams-docs`, plus the shared `app` |
| Climate | Included | Building age and energy labels (BAG, EP-Online), heat and flood risk (Klimaateffectatlas) |
| Measurement | Accuracy, latency and energy per answer, compared with a frontier model | Dutch questions join the evaluation set |

**Settled with this document:** Amsterdam as the Dutch city, policy makers and residents as the users, and English answers with Dutch citations. The remaining choices (no model training; one Neon project per part) carry forward from the scope proposal. If the audience or language changes later, revisit the sources and questions before data collection.

## Target directory tree

```
amsterdam/
  ingest/
    data/                                  # Python + dbt, writes raw_ams_data / ams_data
      .env.example
      pyproject.toml                       # package ams-data-ingest
      alembic.ini
      config/sources.yaml
      migrations/env.py
      migrations/script.py.mako
      migrations/versions/0001_raw_ams_data_and_ams_data_schemas_and_the_.py
      dbt/{dbt_project.yml,profiles.yml,packages.yml,models/sources.yml}
      dbt/models/ams_data/*.sql
      dbt/models/ams_data/schema.yml
      dbt/macros/*.sql
      dbt/tests/*.sql
      src/ams_data_ingest/{__init__.py,cli.py,settings.py}
      tests/{conftest.py,fixtures.py,test_ingest.py,test_dbt.py}
    documents/                            # Python, writes raw_ams_docs / ams_docs
      .env.example
      pyproject.toml                       # package ams-docs-ingest
      alembic.ini
      config/{sources.yaml,corpus.yaml,search.yaml}
      migrations/env.py
      migrations/script.py.mako
      migrations/versions/0001_raw_ams_docs_and_ams_docs_schemas_and_the_.py
      src/ams_docs_ingest/{__init__.py,cli.py,settings.py,corpus.py}
      src/ams_docs_ingest/passages/{outline.py,translate.py,search_entries.py,store.py,embed.py,summary.py}
      src/ams_docs_ingest/{housing_ordinance.py,woningbouwplan.py,council_document.py}
      tests/{conftest.py,fixtures.py,test_corpus.py,test_outline.py,test_translate.py,test_search_entries.py,test_embed.py}
  mcp-servers/
    data/                                 # TypeScript, reads ams_data
      .env.example
      package.json                         # @policyhuis/ams-data-server
      tsconfig.json
      src/{main.ts,Server.ts,AmsDataServerConfig.ts,Tools.ts,Handlers.ts,HousingRepo.ts,Citations.ts,Locators.ts,ToolErrors.ts,Params.ts,Formats.ts}
      test/{Server.test.ts,Citations.test.ts,Locators.test.ts,Params.test.ts,ToolErrors.test.ts,AmsDataServerConfig.test.ts,Tools.test.ts}
      test/fixtures/ams_data.sql
    documents/                            # TypeScript, reads ams_docs
      .env.example
      package.json                         # @policyhuis/ams-docs-server
      config/search.yaml
      tsconfig.json
      src/{main.ts,Server.ts,AmsDocsServerConfig.ts,Tools.ts,Handlers.ts,PassageRepo.ts,QueryEmbedder.ts,SearchConfig.ts,Citations.ts,ToolErrors.ts,Params.ts,Formats.ts}
      test/{Server.test.ts,Citations.test.ts,Params.test.ts,ToolErrors.test.ts,AmsDocsServerConfig.test.ts,Tools.test.ts}
      test/fixtures/ams_docs.sql
```

Root changes: add both server workspaces to `package.json` `workspaces`. `scripts/groups.ts` discovers `amsterdam` as a `yarn dev` group automatically; no script change.

## 1. Data ingestion: `amsterdam/ingest/data/`

Direct counterpart of `san-francisco/ingest/data/`, renamed.

| SF file | NL file | Changes |
|---|---|---|
| `src/sf_data_ingest/settings.py` | `src/ams_data_ingest/settings.py` | `RAW_SCHEMA = "raw_ams_data"`, `DBT_PROJECT`, `SOURCES_FILE`; settings `ams_data_database_url`, `ams_data_reader_password`, `neon_s3_*` |
| `src/sf_data_ingest/cli.py` | `src/ams_data_ingest/cli.py` | Same `ingest` / `dbt` subcommands; `ams-data-ingest ingest [sources…]` |
| `config/sources.yaml` | `config/sources.yaml` | Amsterdam sources; national sources declare their Amsterdam filter |
| `migrations/versions/0001_…py` | `migrations/versions/0001_…py` | `raw_ams_data`, `ams_data`, `ams_data_reader`; same `load_manifest` columns; one raw table per source key |
| `dbt/models/sf_data/*.sql` | `dbt/models/ams_data/*.sql` | Models designed from the loaded Amsterdam data |
| `dbt/macros/*` | `dbt/macros/*` | Amsterdam-specific classification rules, each with a test |

### Confirmed sources

Access method, format, license, update frequency and size were checked at the publisher on 2026-11-17. Two sources are
confirmed and configured in `amsterdam/ingest/data/config/sources.yaml`, with raw tables in migration `0002`:

| Source | Publisher | Access | Format | License | Verified |
|---|---|---|---|---|---|
| Woningbouwplannen Openbaar (Nieuwbouwplannen) | Gemeente Amsterdam (Datateam Stedelijke Ontwikkeling en Beheer) | DSO API, `api.data.amsterdam.nl/v1/nieuwbouwplannen/woningbouwplannen_openbaar`, open, paginated HAL+JSON | JSON; per-project counts by tenure (sociale huur, middeldure huur, vrije sector, …) with `stadsdeel`/`wijk` codes and geometry | Creative Commons, Naamsvermelding (CC-BY) | Live, open, ~1.000 rows per page, `peildatum` is the version |
| Inside Airbnb Amsterdam | Inside Airbnb | bulk download, `data.insideairbnb.com/the-amsterdam/north-holland/amsterdam/<date>/data/listings.csv.gz` | gzipped CSV; per-listing rows with latitude/longitude | CC-BY 4.0 | Live; the 2026-09-16 snapshot is pinned in `sources.yaml` |
| EP-Online energielabels | RVO | Public REST API, `public.ep-online.nl/api/v5/Mutatiebestand/DownloadInfo?fileType=csv&xmlVersion=4`, with an API key in the `Authorization` header (requested once at `epbdwebservices.rvo.nl`; expires after a year of disuse) | ZIP of one semicolon-CSV: every currently valid label in the Netherlands (6.3M rows), with postcode, BAG IDs, `Energieklasse`, `EnergieIndex`, bouwjaar and surface area; refreshed on the first of each month | Geen open licentie; the EP-Online webservicevoorwaarden govern | Key verified against the live API on 2026-11-17: the envelope named `v20261101_v4_csv.zip` and the download worked. The key is a secret, read from `EP_ONLINE_API_KEY` in this project's `.env`, never from a config file or the manifest. The monthly file is a full register snapshot despite the "Mutatiebestand" name; the `Totaalbestand` endpoints answer 404 on the public API. |

Documents, also verified: the consolidated Huisvestingsverordening Amsterdam 2024 is `CVDR706038` on
lokaleregelgeving.overheid.nl (HTML, last modified 2026-01-01); the gmb-2023-* and gmb-2024-* besluiten PDFs on
zoek.officielebekendmakingen.nl download directly; the Woningbouwplan 2022-2028 PDF (Gemeente Amsterdam, 2023) and its
2025 jaarrapportage are on assets.amsterdam.nl. These join the documents corpus via the documents pipeline, not
`sources.yaml`.

Deferred until needed, with the reason: CBS StatLine OData and BAG (national, each needs its own source kind and an
Amsterdam filter — add when a question requires them), Klimaateffectatlas (Geopackage/Geotiff bulk files, CC-BY 4.0, no
API), Open Raadsinformatie (the classic API shuts down 2026-11-01; OpenBesluitvorming is the successor and needs its own
check).

One operational note on the EP-Online load: the monthly file holds 6.3M rows and the load pipeline materializes the
parsed rows in memory, so ingesting it wants a machine with ample RAM; a streaming refactor of `load.py` is the
follow-up if that becomes a constraint.

### Source types in `shared/ingest`

Added additively alongside Socrata/ArcGIS/PDF, each with tests using synthetic responses:

- `kind: hal_json_api` — a paginated HAL+JSON API (`_embedded` records, `_links.next`), versioned by the latest value
  of a record field. Added; used by Nieuwbouwplannen.
- `kind: csv_download` — a CSV (gzip detected by extension), version parsed from the URL by a regex, optional
  latitude/longitude fields building point geometries. Added; used by Inside Airbnb.
- `kind: ep_online` — RVO's EP-Online public API: the `DownloadInfo` envelope, then the tokenized ZIP download; the
  key comes from settings, the version from the envelope's `bestandsnaam`. Added; used by the energielabels source.

Still to add when their sources are taken up: `odata` for CBS StatLine, a BAG kind, a CAS bulk-file kind, and
`law_xml` for the documents corpus later.

Existing source types and the load manifest's columns did not change. A test in `shared/ingest` fails if shared code
names a city.

### Candidate dbt models

Design from the loaded data; each model suggests a list tool and a summary tool.

| Model | Source | Suggested tools |
|---|---|---|
| `districts`, `neighborhoods` | CBS / Amsterdam portal | Reference values for tool inputs |
| `housing_stock` | CBS StatLine | Stock by owner type, district, year |
| `buildings` | BAG | Age, status, geometry |
| `energy_labels` | EP-Online joined to BAG | Units by label and age band |
| `climate_zones` | Klimaateffectatlas | Heat/flood zones with publisher and date |
| `planned_housing` | Nieuwbouwplannen / Woningbouwplan | Projects by status, district, target |
| `short_term_rentals` | Inside Airbnb | Listings by neighborhood and time |

### Tests

Mirror `san-francisco/ingest/data/tests/`: archive → manifest → rows; unchanged data skipped; the reader role can read `ams_data` but not `raw_ams_data`; each dbt model's grain and known cases. Against `imresamu/postgis:17-3.5`.

## 2. Data server: `amsterdam/mcp-servers/data/`

Copy of `san-francisco/mcp-servers/data/`, renamed.

| SF file | NL file | Changes |
|---|---|---|
| `SfDataServerConfig.ts` | `AmsDataServerConfig.ts` | `AmsDataEnv`; `AMS_DATA_READER_DATABASE_URL`, `AMS_DATA_PORT` |
| `Tools.ts` | `Tools.ts` | Amsterdam tool names, schemas, descriptions; no prefix |
| `HousingRepo.ts` | `HousingRepo.ts` | SQL over `ams_data`; district/neighborhood parameters |
| `Handlers.ts` | `Handlers.ts` | Input checks against loaded reference tables |
| `Citations.ts` | `Citations.ts` | `NAMESPACE = "ams_data"`; `ams_data.<datasetKey>@<version>#<queryKey>` |
| `Locators.ts` | `Locators.ts` | Amsterdam locator wording, built from parameters only |
| `ToolErrors.ts`, `Params.ts`, `Formats.ts` | same names | Copied verbatim, owned by NL from then on |
| `Server.ts`, `main.ts` | same | Same MCP-over-HTTP wiring |

### Tools follow the data

Each dbt model suggests a list tool and a summary tool; the questions decide which are worth having. Inputs are validated against loaded reference tables (district and neighborhood codes, statuses, labels), so new values in a source need no contract change. Every tool publishes a title and an `outputSchema`, and every description and title holds no digit.

### Contract additions (additive)

- `protocol/src/Citation.ts`: optional `jurisdiction` (Amsterdam, or a district for a district-scoped source) and `language` / `machineTranslated`.
- `backend/src/loop/ToolResults.ts`: the `ServerCitation` schema gains the same optional fields and passes them through.
- `backend/config/servers.yaml`:
  ```yaml
  - name: ams-data
    label: NL Data
    url: http://localhost:<port>/mcp
    prefix: ams_data_
  ```

With one city, `jurisdiction` is optional rather than required; a district (`stadsdeel`) or neighborhood (`wijk`) is the natural value when a source is district-scoped.

### Tests

Same as `sf-data`: every tool has an `outputSchema` and title; citations decode under `ams_data`; `UnknownValue` lists valid values; `null` is absent; `DatabaseUnavailable` on an unreachable database; descriptions and titles contain no digits. Add a test that a district filter keeps two districts' rows apart in one result.

## 3. Documents ingestion: `amsterdam/ingest/documents/`

Counterpart of `san-francisco/ingest/documents/`, with a translation step and a Dutch splitter.

### Corpus candidates

| Document | Publisher | Type | Notes |
|---|---|---|---|
| Huisvestingsverordening Amsterdam 2024 | Gemeente Amsterdam | law | Amsterdam's housing ordinance; the first rule-plus-data pair's legal text |
| Woningbouwplan | Gemeente Amsterdam | report | Housing construction plan; targets and locations |
| Wonen in Amsterdam | Gemeente Amsterdam | report | Housing in Amsterdam reports |
| Council documents | Gemeente Amsterdam / Open Raadsinformatie | reference | For policy-staff questions; check reuse terms |
| Huurcommissie guidance | Huurcommissie | reference | For resident-facing answers, if residents are in scope |

Corpus membership, each document's type, description and splitter live in `config/corpus.yaml`. Descriptions are worded from the document itself and hold no digits.

### Schema

`raw_ams_docs`, `ams_docs`, `ams_docs_reader`; same `load_manifest` and `document_pages`. `ams_docs.documents` gains language fields; `ams_docs.passages` gains `text_nl`, `text_en` and `translation_model`; `search_entries` keeps its shape and stores the embedding model and host.

### Pipeline modules

| Module | Purpose |
|---|---|
| `passages/outline.py` | Dutch article structure (`artikel`, `lid`, `a`, `b`, `1`, `i`), not SF's `((a),(1),(A),(i))` stack |
| `passages/translate.py` | Translate `text_nl` to `text_en` once, in batch; store the model id; label |
| `documents/housing_ordinance.py` | Split the housing ordinance by article |
| `documents/woningbouwplan.py` | Split the construction plan by its own headings |
| `documents/council_document.py` | Split council documents by headings and page |
| `passages/search_entries.py` | Same `own`/`subtree`/`outline` logic over the translated text |
| `passages/embed.py` | Reuse the pinned-host OpenRouter embedder |
| `passages/store.py` | Write documents, passages and entries transactionally, with both texts |

### Translation and search

- **Translation at load time**, once per passage; no translation runs per question. Both texts are stored; citations quote the Dutch original; answers read the English translation with the original alongside; translations are labeled.
- **Translation model** is spike S3: model, license, and whether to embed the Dutch original or the English translation. Store both and record the model id.
- **Search**: vector search first; an optional identifier search over the Dutch original with the `simple` (unstemmed) configuration for exact terms such as `artikel 7:248`; keyword search over the English translation only if the Dutch spike keeps it.
- **PDF tables**: spike S6 chooses the extractor for table-heavy Dutch PDFs.

### Tests

`test_translate.py` (both texts stored, model id recorded, a failure leaves the stored document unchanged), `test_outline.py` (Dutch article nesting), `test_corpus.py` (every corpus entry is a source; descriptions hold no digits), `test_embed.py` (pinned host, unusable vectors refused), against the pgvector PostGIS container.

## 4. Docs server: `amsterdam/mcp-servers/documents/`

Copy of `sf-docs` with Dutch tools and citations.

| SF file | NL file | Changes |
|---|---|---|
| `SfDocsServerConfig.ts` | `AmsDocsServerConfig.ts` | `AMS_DOCS_READER_DATABASE_URL`, `AMS_DOCS_PORT`, `OPENROUTER_API_KEY` |
| `Tools.ts` | `Tools.ts` | `search_policy`, `get_article`, `list_articles` (or keep `get_provision`/`list_provisions` if the names stay generic) |
| `PassageRepo.ts` | `PassageRepo.ts` | SQL over `ams_docs`; returns both texts |
| `Citations.ts` | `Citations.ts` | `NAMESPACE = "ams_docs"`; `ams_docs.<documentId>@<versionDate>#<article>`; add `language` / `machineTranslated`; locator as `artikel 7:248` |
| `QueryEmbedder.ts`, `SearchConfig.ts` | same | Dutch/multilingual model and pinned host |
| `Server.ts` | same | Startup check that the stored embedding model and host match |

## 5. Registration with the agent

1. Add `ams-data` and `ams-docs` to `backend/config/servers.yaml` with prefixes `ams_data_` and `ams_docs_`, labels `NL Data` and `NL Documents` (or `Amsterdam Data` / `Amsterdam Documents`), and their URLs.
2. `yarn dev --include amsterdam` works once the workspaces exist; update the README's running instructions.
3. Restart the backend after adding a server or changing its tools; it lists tools only at connection time.
4. End-to-end check: ask a Dutch question; lookups show the server's label and titles; citation chips open Dutch sources; `app.tool_calls` records the calls.

## 6. Sequencing and dependencies

| Step | Depends on | Produces |
|---|---|---|
| M0a. Confirm the Amsterdam source list — **done** | Amsterdam, audience and language settled | Sources for `sources.yaml` |
| M0b. Check each source's access, license, format and size — **done** | M0a | `sources.yaml` |
| M1. Add shared source types — **done** for `hal_json_api`, `csv_download` and `ep_online` | M0b | CBS/BAG/CAS loaders still to add when those sources are taken up |
| M2. `amsterdam/ingest/data/` skeleton, migration 0001 and raw tables for the confirmed sources in migration 0002 — **done** | M1 | `raw_ams_data`, `ams_data`, `ams_data_reader`, one raw table per source |
| M3. Load Amsterdam end to end; dbt models and tests | M2 | `ams_data` schema |
| M4. `ams-data` server, tools, registration | M3 | Dutch data answers |
| M5. Spike S3 (translation) and S4 Dutch run | M0a | Translation model, embedding decision |
| M6. `amsterdam/ingest/documents/` and `ams-docs` | M5 | Dutch law answers |
| M7. Amsterdam and cross-city question set; evaluation | M4, M6 | Measured Dutch answers |

S3 is the critical path for documents; S6 is a risk for table-heavy Dutch PDFs.

## 7. Draft questions

Amsterdam's questions are `AMS-01` to `AMS-10` in the [Netherlands Ingestion and Tools Plan](./netherlands-ingestion.md#draft-questions), pending research-team confirmation. With Amsterdam settled they stand as drafted:

- **Rule:** social-rent eligibility under the 2024 housing ordinance; permit to split an apartment; national rent law before and after July 2024.
- **Ground:** social-rent homes planned in Nieuw-West; share of homes owned by housing corporations by district; short-term rental listings in Centrum.
- **Rule + data:** on track for the social-rent construction share.
- **Climate:** energy label E or worse and building age by neighborhood; heat and flood risk on planned housing; renovation energy-performance rules.

Cross-city: how Amsterdam and San Francisco each decide affordable-housing eligibility, and which requires more affordable units and how that is enforced. These are the hardest type: different concepts, income definitions and languages.

Declines: causation; individual legal advice (refer to the Huurcommissie); unit-level Amsterdam rents; rent precision for a specific apartment; "people evicted" reported as notices filed.

## 8. What does not change

- `backend/` agent loop, system prompt and trace store: no city-specific code.
- `browser-app/`: no code change for Dutch data; Dutch originals beside translations is a follow-up.
- `protocol/`: only additive optional citation fields.
- `shared/node-config/`: unchanged.
- `scripts/dev.ts` and `groups.ts`: unchanged.

## 9. Risks

1. **Audience and language** — settled as policy makers and residents, with English answers and Dutch citations; the source list and question set must serve both audiences.
2. **Translation quality and review** — no Dutch-speaking reviewer confirmed; machine translation of legal text is a correctness risk.
3. **S3/S4/S6 open** — documents work is blocked until translation and embedding are decided.
4. **National data size** — BAG, EP-Online and CBS may exceed one 1 GB Neon project; filter at download and measure before loading.
5. **Source access** — the EP-Online key expires after a year of disuse and was shared in conversation, so it should be rotated once the register loads are routine; Inside Airbnb terms, Open Raadsinformatie reuse terms, and Amsterdam portal datasets need checking.
6. **Tool count** — both cities' tools appear on every question; the evaluation must check the model still picks the right one.
7. **Jurisdiction semantics** — with one city, decide whether `jurisdiction` means Amsterdam, a district or a neighborhood, and keep it optional.

## 10. Open questions

1. Who contacts TNO or SURF about GPT-NL, and who reviews translations?
2. Which Amsterdam portal datasets are open and machine-readable?
3. Do BAG, EP-Online and CBS for Amsterdam fit one 1 GB Neon project?
4. What does `jurisdiction` mean for a single-city deployment?
