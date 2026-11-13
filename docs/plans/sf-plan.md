# PolicyHuis: San Francisco Plan

This plan covers the San Francisco build: its sources and its MCP servers. The agent loop that every city's servers plug into is in the [Agent Loop Plan](agent-loop.md). It builds on the [MVP Technical Plan](mvp-technical-plan.md), which remains the reference for the shared architecture (one agent, independent MCP servers, the conventions between them, the data layer, the network, evaluation and energy). Where this plan is more specific, this plan wins for San Francisco.

## Summary

- **Focus:** San Francisco's affordable housing pipeline. Two questions run through the demo: *where is it, and is it moving?* and *is it climate-ready?* The research behind this choice is in [*SF affordable housing challenges*](../research/reports/SF%20affordable%20housing%20challenges.md) (November 4, 2026): money, not zoning, now holds projects back, and the figures cited in public debate are often real dataset totals with misleading labels, which is where cited answers help most.
- **Users:** policy makers and residents. One answer style for now; the API is designed so an audience attribute can be added later without breaking callers.
- **Phase 1, prototype:** the two project pipelines (Planning's and MOHCD's), two flood maps and the air-pollutant exposure zone, served by `sf-data`, answered through the agent loop and shown in a simple web app. Answers cite datasets only.
- **Phase 2, rules and evictions:** the docs server, with the inclusionary, all-electric and air-quality ordinances and the analysis reports that explain stalls, then the Rent Ordinance, the California tenant-protection statutes and the Eviction Notices dataset with its tools.
- **Phase 3, evaluation:** the San Francisco questions run against the open-weight model in the cloud (`open_cloud`, Qwen3.5-397B-A17B through OpenRouter), the configuration the project is built on, and the frontier comparison (`frontier`, Claude Opus 5.5). The `local` configuration stays as a reference for running the model on-premises.
- **Servers:** one San Francisco data server, `sf-data` (see [Data servers](#data-servers)), and from Phase 2 the docs server, `sf-docs`, over San Francisco's own corpus.
- **Data tools:** fixed, parameterized tools backed by tested queries. No free-form query tool.
- **Agent loop:** a custom multi-step loop over Effect's `LanguageModel`, the same for every city, with no conversation history, streaming typed events to the API (see the [Agent Loop Plan](agent-loop.md)).

## What already exists in San Francisco

From the research report [*SF housing policy tools landscape*](../research/reports/SF%20housing%20policy%20tools%20landscape.md) (November 3, 2026), which cites a source for each point:

- **No public tool answers San Francisco housing questions with citations that join the law, the city's housing data and climate risk.** That holds for policy makers and for residents.
- **Law:** the official code host (American Legal Publishing) offers keyword search only, and no chatbot covers the Rent Ordinance or the Planning Code. The closest prior work is the City Attorney's use of Stanford RegLab's STARA to scan the whole Municipal Code, which was internal and not about housing.
- **Data:** official housing data is plentiful (DataSF, Planning's Housing Dashboard, the pipeline reports, the Rent Board Housing Inventory), but none of it can be queried in plain language through an official tool.
- **City staff and AI:** about 30,000 city staff have had Copilot Chat since July 2025. The city's Generative AI Guidelines prohibit "relying on AI to review legal or regulatory issues" and treat summarizing policy-related data as higher risk. For policy makers, the tool must therefore present itself as cited research that a person checks, and it must do something general-purpose assistants already approved for staff cannot.
- **Climate:** the city's sea-level-rise and flood layers are open but dated, and each covers a different hazard. No public tool shows housing projects against them.
- **Residents:** tenants rely on people (Rent Board counselors, tenant organizations, the right-to-counsel program). No San Francisco agency or nonprofit runs a tenant AI tool. The clearest gap is telling a tenant which law covers their unit: the Rent Ordinance, the state Tenant Protection Act, or neither. The documented risks are procedural errors (wrong deadlines, wrong steps), which Stanford's Legal Design Lab finds do the most harm, and AI that presents legal information as legal advice.

These findings set requirements that run through this plan:

1. Every claim cites the provision or dataset behind it, with its version or as-of date.
2. Answers give legal information, not advice, and point to the Rent Board or a tenant organization for individual cases.
3. Every climate answer names the hazard map or exposure zone it used, with its date and limits.
4. Status answers give the pipeline snapshot they come from, and say "approved in 2014, in this status since 2019" rather than calling a project "stalled": a stall threshold would be our judgment, not the data's.
5. Eviction answers (Phase 2) say that notices are filings, not completed evictions.

## Users and questions

One answer style serves both audiences. The tools and citations are the same for both; what differs is the question.

**Phase 1** (datasets only):

| Type | Resident example | Policy maker example | Sources |
|---|---|---|---|
| Where is it | "What affordable housing is planned in my neighborhood, and for which income levels?" | "How many affordable units are in the pipeline by supervisor district and income band?" | MOHCD pipeline; Planning pipeline |
| Is it moving | "The project on my block was approved years ago. Is anything happening?" | "Which Planning-approved projects with affordable units have not filed for a building permit, and since when?" | Planning pipeline |
| Checking a claim | "Is it true that 10,000 affordable homes are stalled?" | "How many of MOHCD's pipeline units are under construction, and how many are not?" | MOHCD pipeline: the research found this claim matches the dataset's total, which includes projects already under construction |
| Climate-ready | "Are new affordable buildings being built in flood-prone areas?" | "Which affordable pipeline projects fall in the 66-inch sea-level-rise and 100-year storm zone, or in the air-pollutant exposure zone, and how many units do they hold?" | Both pipelines; flood maps; air-pollutant exposure zone |
| Data currency | "How up to date is this?" | "Which quarter's pipeline is this, and when did MOHCD last update its data?" | Dataset metadata |
| Decline | "Should I apply for this building?" | "Would lower inclusionary rates get these projects built?" | None: refer, or show the data without a causal claim |

**Phase 2** adds rules and evictions:

| Type | Resident example | Policy maker example | Sources |
|---|---|---|---|
| Why is it stuck | "Why are approved projects not getting built?" | "What does the budget analyst say the affordable housing funding gap is, and what drives unit costs?" | Analysis reports; Planning pipeline |
| Rule | "Does a new building near the freeway have to filter the air?" | "Which inclusionary requirements apply to a 30-unit project since August 2026?" "When must affordable renovations be all-electric?" | Inclusionary, Article 38 and all-electric ordinances |
| Rule (tenants) | "Can my landlord evict me to move in themselves, and what do they owe me?" (answered as information, with a referral) | "Which grounds for eviction does Section 37.9 allow?" | Chapter 37 |
| Rule + data (rent increases) | "How much can my landlord raise the rent each year in a rent-controlled apartment?" | "What has the annual allowable increase been since 2020?" | Chapter 37, Sec. 37.3(a)(1) for the rule; the Rent Board's annual allowable increase for the figure. Expected: 1.6% for March 1, 2026 to February 28, 2027, cited to the dataset, and the rule (60% of the CPI increase, at most 7%) cited to 37.3(a)(1). The ordinance holds no figure, so the rule alone cannot answer, and its findings in 37.1(c), which mention an old 4% floor, are not the rule |
| Rule (state) | "Does the state rent cap apply if my unit is under San Francisco rent control?" | "How does the Tenant Protection Act interact with local rent control?" | Civil Code sections from the Tenant Protection Act; Costa-Hawkins |
| Ground | "How many eviction notices were filed in my neighborhood last year?" | "Which eviction grounds account for most notices since 2020, by supervisor district?" | Eviction Notices |
| Rule + data | "What is an owner move-in eviction, and how common is it in the Mission?" | "Which approved projects in the air-pollutant exposure zone will need enhanced ventilation?" | Ordinances with either dataset |

The San Francisco question set, with expected answers, is [`evaluation/questions/sf.yaml`](../../evaluation/questions/sf.yaml); it is reviewed with whoever checks San Francisco answers (see [Open questions](#open-questions)).

### Leaving room for an audience attribute

The first request schema carries only the question. Adding an audience later is an additive change:

- The request gains an optional `audience` field (for example `resident` or `policy_maker`). Callers that omit it get today's behavior.
- The agent selects a system prompt variant by audience; prompts are versioned files, and each trace records the variant and version used.
- The evaluation set tags each question with its audience, so scores can be split by audience once the field exists.

Nothing in Phase 1 or 2 branches on audience, so adding it touches the request schema, prompt selection and evaluation tagging only.

## Sources

DataSF moved from `data.sfgov.org` to `data.sf.gov`; old links redirect.

**Publicly available sources only.** This is a demo, so it uses sources the city and state publish openly and does not seek reuse permissions. Every citation names the publisher and links to the source, and each dataset's stated license (or the absence of one) is recorded with the load and returned by `sf_data_dataset_info`.

**Size.** Phase 1 is about 2,100 project rows and four zone layers; Phase 2 adds about 49,000 eviction notices and a few thousand passages. At the MVP plan's estimate of 6–10 KB per passage, everything fits well inside one 1 GB Neon project per server. This is an estimate, confirmed by measuring after the first load.

### Phase 1 data

| Source | ID | License | Updated | Size and shape | Notes |
|---|---|---|---|---|---|
| SF Development Pipeline | [`6jgi-cpb4`](https://data.sf.gov/d/6jgi-cpb4) (Planning) | CC0 1.0 | Quarterly; 2026 Q2 snapshot, rows updated August 28, 2026 | 1,917 projects; `current_status` (PL Filed, PL Approved, BP Filed, BP Approved, BP Issued, Construction) with `current_status_date`, `approved_date_planning`, net and affordable units by income level (`bmr_units_ex_low` … `bmr_units_moderate`), `blklot`, `case_no`, `nhood41`, `sd22`, latitude and longitude | Every project in the city, not only affordable ones; 162 carry affordable units. A parcel can hold several projects (118 parcels do), so a project is identified by parcel, Planning case and building permit application together. 8 projects have no status date. Neighborhood names use " - " where the Analysis Neighborhoods list uses "/" ("Castro - Upper Market"); a dbt macro converts them. Holds only the current quarter: earlier snapshots were retired from DataSF as of 2024 Q3 and are available on request from the dataset owner, per its description. The description also warns that "the data may change at any time" while Planning improves its systems. One status value appears as `BP BP Issued` (6 rows), which the dbt model maps to `BP Issued` with a test. Field definitions: Planning's [data dictionary](https://sfplanning.org/sites/default/files/documents/reports/pipeline_data_dictionary.pdf). |
| MOHCD Affordable Housing Pipeline | [`aaxw-2cb8`](https://data.sf.gov/d/aaxw-2cb8) | PDDL | Quarterly; rows updated May 21, 2026 | 190 projects; status, construction stage, units by bedroom count and by income level (20% to 150% of area median income), estimated construction start and completion, neighborhood, district, latitude and longitude | The dataset's description still says "as of September 30, 2023", so its true as-of date is unclear; answers give the rows-updated date. Estimated start dates for several projects have already passed; answers say they are MOHCD's estimates. |
| SFPUC 100-Year Storm Flood Risk Map, 2024 update | SFPUC's GIS server: [FeatureServer](https://gis.sfpuc.org/server/rest/services/Hosted/100_Year_Storm_Flood_Risk_Map_2024_Update/FeatureServer), used by SFPUC's [flood map app](https://gis.sfpuc.org/portal/apps/instant/basic/index.html?appid=5dbe439cb71f42c89de0e2af110ae1f0) | None stated; layer credited to SFPUC | Map updated December 2024 per [sfpuc.gov](https://www.sfpuc.gov/learning/emergency-preparedness/flood-maps); layers last edited December 12, 2025 | Layer 2: one flood risk zone polygon (920 acres). Layer 0: 1,450 flood elevation zones (`contourmin`, `contourmax`, feet above San Francisco City Datum) | Stormwater flooding only, not Bay or ocean flooding. Replaces the 2018 version on the older ArcGIS Online service and DataSF (last edited July 1, 2022). The zone layer's description still says July 1, 2022, so the loader records the service's edit date, not the description. Flood elevations are heights above the datum, not flood depths. |
| 100-year storm + 66 inches of sea-level rise | [`6ann-usi8`](https://data.sf.gov/d/6ann-usi8) | **None listed on DataSF**; attributed to BCDC | Rows updated February 25, 2020 | Multipolygon | From BCDC's Adapting to Rising Tides program; 66 inches of sea-level rise plus a 100-year storm equals 108 inches of total water level. Used instead of the 108-inch zone *line* (`92e4-7ptg`), which is a boundary line and cannot answer whether a point is inside the zone. |
| Air Pollutant Exposure Zone (2025) | [`t65d-x6p8`](https://data.sf.gov/d/t65d-x6p8) (Planning and Public Health) | Public domain | Rows updated March 19, 2025 | One multipolygon | New housing inside the zone must meet Health Code Article 38's enhanced ventilation rules. An exposure zone, not a hazard forecast. |
| Analysis Neighborhoods | [`j2bu-swwd`](https://data.sf.gov/d/j2bu-swwd) | PDDL | October 17, 2023 | 41 neighborhoods | Source of valid neighborhood names for tool inputs. Both pipelines name neighborhoods from this set (`nhood41`, `city_analysis_neighborhood`); a dbt test fails on any name outside it. |

**The two pipelines overlap only in part.** Fewer than half of MOHCD's projects match a Planning pipeline project by Planning case number or by block and lot (after padding lot numbers to MOHCD's format), so the two cannot be merged into one project list. Phase 1 serves them as two sources with their own tools, and says which one an answer comes from. A tested crosswalk between them is a later addition.

**Hazard maps answer different questions.** The sea-level-rise layer is an extreme planning scenario: the city's disclaimer for its 108-inch zone calls that scenario "very, very unlikely", and the modelling rests on 2010 ground conditions. The SFPUC map covers stormwater only. The air-pollutant exposure zone triggers a building requirement and is not a hazard map. Tools return results per zone, with each zone's name, date and limits, and never merge them into one "risk" answer.

### Phase 2 documents

The docs server's corpus holds laws and the analysis reports that explain them. Each citation carries a `documentType` (`law`, `report` or `reference`), and answers label reports as analysis, not rules.

| Document | Publisher | Access | Type | As of | Notes |
|---|---|---|---|---|---|
| Inclusionary Housing Program updates and impact fee reductions (Board File 260538) | Board of Supervisors, [Legistar](https://sfgov.legistar.com/View.ashx?GUID=40004122-9FEB-4E0C-A67B-2126814C08E5&ID=15691706&M=F) | PDF, 195 pages | Law | Amended in Board July 14, 2026 | Amends the Planning Code, including Section 415. **Not loaded:** the enacted text and ordinance number are unconfirmed (see [Open questions](#open-questions)), and as an amending ordinance it marks deletions only by strikethrough, which text extraction cannot detect, so it would index repealed wording as law and still miss the unchanged subsections it omits. |
| All-electric major renovations (Ordinance 174-25) | Board of Supervisors, [sfbos.org](https://www.sfbos.org/sites/default/files/o0174-25.pdf) | PDF | Law | 2025 | 100% affordable projects are exempt until July 1, 2027, per the research. **Not loaded:** an amending ordinance whose strikethrough deletions cannot be told from current text in its OCR layer; it prints a passage date but no effective date. |
| Article 38 enhanced ventilation amendments (Ordinance 186-25) | Board of Supervisors, [sfbos.org](https://www.sfbos.org/sites/default/files/o0186-25.pdf) | PDF | Law | 2025 | Effective date unconfirmed. **Not loaded:** an amending ordinance, as for Ordinance 174-25. |
| Funding and Incentivizing Affordable Housing in San Francisco (`bla_affordable_housing`) | San Francisco Board of Supervisors, Budget and Legislative Analyst, [sf.gov](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf) | PDF, 132 pages | Report | June 5, 2026, printed as "Date:  June 5,2026" | Costs per unit, funding sources and the funding gap; the impacts of the temporary fee reduction; ten financing strategies; equity gaps. Loaded: split by the headings on its contents page (page 27), then by page (see [Ingestion for San Francisco](#ingestion-for-san-francisco)). |
| Pipeline data dictionary | SF Planning, [sfplanning.org](https://sfplanning.org/sites/default/files/documents/reports/pipeline_data_dictionary.pdf) | PDF | Reference | Undated | What each pipeline status means. A 1-page field glossary with no printed date. Its PDF metadata title, "Pipeline Quarterly Report Q2 2011", is free text; its `/ModDate` is May 3, 2015 (XMP agrees), and the server's `Last-Modified` is April 4, 2023. To be loaded with `version_from: pdf_mod_date`, so its version is May 3, 2015. |
| Rent Ordinance (Administrative Code, Chapter 37) | San Francisco Rent Board | PDF, [sf.gov](https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf), 146 pages, 27 sections (Sec. 37.1 to Sec. 37.16) | Law | Amended through June 29, 2026 | The PDF states it is "not an official record" and that it reflects court decisions and state legislation the official record may not. A separate [list of amendments](https://media.api.sf.gov/documents/601_List_of_Ord_Amendments_6-29-26.pdf) is published alongside. Citations link to this PDF. |
| California Civil Code: Tenant Protection Act sections (1946.2, 1947.12, 1947.13) and the Costa-Hawkins Rental Housing Act (1954.50 and following) | California Legislature | Daily bulk database downloads at [downloads.leginfo.legislature.ca.gov](https://downloads.leginfo.legislature.ca.gov/) | Law | Daily | The exact sections loaded are corpus membership in `san-francisco/ingest/documents/config/corpus.yaml`. A 2025 bill (SB 522) proposed amendments to 1946.2 and 1947.12; whether it was enacted is unconfirmed, which is why every load records the version it took. **Deferred:** per-section pages on leginfo.legislature.ca.gov answer automated requests with a JavaScript challenge (HTTP 403), and the daily bulk database is a 1.1 GB zip, archived whole with each load. |

American Legal Publishing, the official host of the city's codes, refused automated requests during the research, so code sections come from the enacted ordinances and the Rent Board's copy, and citations link to those. The city's older raw code files on GitHub ([SFMOCI/openlaw](https://github.com/SFMOCI/openlaw)) were last updated in April 2014, so they cannot serve as the source for current law.

The Rent Ordinance PDF's text extracts cleanly. Each section starts with a "Sec. 37.x" heading, and the pleading-paper line numbers (1 to 28) down each page are removed during extraction; the ordinances use the same pleading format.

### Phase 2 data

| Source | DataSF ID | License | Updated | Size and shape | Notes |
|---|---|---|---|---|---|
| Eviction Notices | [`5cei-gny5`](https://data.sf.gov/d/5cei-gny5) | ODC Public Domain (PDDL) | Monthly; rows updated November 6, 2026 | 49,159 notices filed from January 2, 1997 to October 29, 2026; 19 ground flags per notice, block-level address, supervisor district, analysis neighborhood, point location | Notices filed with the Rent Board under Section 37.9(c). A notice is not an eviction. A notice can carry several grounds. `eviction_id` is unique and every neighborhood name is in the Analysis Neighborhoods list; some notices have no neighborhood, district, location or ground flag, which the dbt models keep and count. |
| Annual Allowable Rent Increase for Units Under Rent Control | [`hsxb-ci7b`](https://data.sf.gov/d/hsxb-ci7b) (Rent Board) | ODC Public Domain (PDDL) | Yearly, effective March 1; rows updated May 1, 2026 | 46 periods from April 1, 1982 (7.0%) to March 1, 2026 (1.6%); `effective_starting_date`, `annual_allowable_increase` (percent) | The figure Sec. 37.3(a)(1) has the Rent Board publish: in the dataset's description, "60% of the percentage increase in the Consumer Price Index (CPI) for All Urban Consumers in the San Francisco-Oakland-San Jose region for the 12-month period ending October 31", per Rules and Regulations Section 1.12. One period per year with no gap; every period starts March 1 but the first (April 1, 1982, matching 37.3(a)(2)'s "between April 1, 1982 and…") and a second 1992 period from December 8, 1992, matching the amendment to Sec. 37.3 "by Resolution No. 961-92, effective December 8, 1992" in the ordinance's history. The older `j833-e5ua` ("1982 - 2020") exposes no columns and is not used |

| Report | Publisher and link | License | Updated | Size and shape | Notes |
|---|---|---|---|---|---|
| Rent Board Annual Report on Eviction Notices, 2025-2026 | San Francisco Residential Rent Stabilization and Arbitration Board, [sf.gov](https://media.api.sf.gov/documents/Rent_Board_Annual_Eviction_Report_25-26_2HGK2Cl.pdf) | None stated | Dated April 8, 2026; yearly, required by Section 37.6(j); past reports listed at [sf.gov](https://sf.gov/information/rent-board-statistics-and-reports) | PDF, 4 pages. Page 2 lists each eviction reason with its "Ordinance Section" (20 reasons, 37.9(a)(1) to 37.9(a)(17), 37.9(b), and "other or no reason given" with no section) | Its introduction describes its data in the same words as the Eviction Notices dataset. It reports that an ordinance effective February 9, 2026 added 37.9(a)(17) (demolition of a whole building for redevelopment) and narrowed 37.9(a)(10) to a single unit; the dataset has no column for (a)(17). |

**Linking eviction grounds to the ordinance.** The dataset names each ground in its own words ("owner move in") and gives no section. The annual eviction report gives each of its reasons with its Ordinance section, so the sections come from the loaded report, never typed by hand: `eviction_report_grounds` parses the report's table. Only the pairing of each dataset column with a report reason is ours, because no source states it: the dbt macro `eviction_ground_reason` pairs them by wording (`owner_move_in` with "owner/relative move-in"), and `eviction_grounds` joins the two. A column with no reason, or a reason missing from the report, fails the build; a report reason with no column (today, 37.9(a)(17)) is listed by a warning. Tools return each ground's label and section as the report gives them and do not sort grounds into categories. The pairing was checked against two years of reports and the Rent Ordinance amended through June 29, 2026. Where the pairing has limits:

- The report gives 37.9(a)(1) for both non-payment and habitual late payment; the ordinance's (A) and (B) split is not used.
- A subletting dispute can be filed as `unapproved_subtenant` (37.9(a)(7)) or as `breach` (37.9(a)(2)), and rehabilitation work under 37.9(a)(11) or (a)(12): the landlord's checkbox decides.
- "Other or no reason given" is broader than the dataset's description of `other_cause`.
- Sections (a)(14) to (a)(17) were added after 1997; the section numbering for older notices was not checked.

## Data servers

**One San Francisco data server, `sf-data`**, holding the housing pipelines, the zones they are checked against and, from Phase 2, the eviction data in one schema. Its code is in `san-francisco/mcp-servers/data/`; its sources, migrations and dbt models are in `san-francisco/ingest/data/`. The two are deployed apart: the ingestion project runs as a scheduled job with the owner role, the server as a long-lived service with the read-only `sf_data_reader` role. Code several nodes need done the same way (fetching, archiving and loading sources; reading configuration) is in `shared/`, installed by each node as a library; what a server publishes (its tools, citations and errors) is its own code, following the [conventions](#citations-and-tool-errors).

The climate question needs a spatial join: which pipeline projects fall inside which zone. Done in the database, that join is one tested query with PostGIS. Split across a housing server and a climate server, the model would have to carry each project's coordinates from one server's result into another server's call, which a model does unreliably and which no test can pin.

The split is revisited when a climate source covers places beyond San Francisco (for example, national flood maps for several cities, or the Netherlands' national climate layers). A climate server then answers by location for any city, and the city data servers call it at load time, not through the model.

**Neon layout**, following the scope proposal's one-account, project-per-part approach:

| Neon project | Holds | From |
|---|---|---|
| `sf-data` | Both pipelines, the flood and exposure zones and neighborhoods with PostGIS; eviction notices from Phase 2 | Phase 1 |
| `app` | Traces and evaluation results (shared with every city) | Phase 1 |
| `sf-docs` | The ordinances, reports, Chapter 37 and the California sections: passages, embeddings, search indexes | Phase 2 |

Neon supports both extensions needed: PostGIS (3.5.7 on Postgres 17) and pgvector (0.8.0 on Postgres 17), per [Neon's extension list](https://neon.com/docs/extensions/pg-extensions).

## Citations and tool errors

Once servers run on their own devices, the only interface between a server and the backend is what the server exposes over MCP: its tool definitions and results, following two conventions, for citations and tool errors, defined in [Domain-Driven Design](../domain-driven-design.md#conventions-between-servers-and-the-backend). No package is shared between the servers and the backend, or between the servers: each server holds its own copy of the few helpers it uses, and `protocol/` is the contract between the backend and the browser app only.

| Where | Holds | Used by |
|---|---|---|
| Each server's `src/` | `Formats.ts` (dates, months, counts), `Params.ts` (`OptionalParam`), `ToolErrors.ts` (`UnknownValue`, `DatabaseUnavailable`, `DataUnavailable`, `withDataErrors`), and its own `Citations.ts`: the citation schema and how its IDs are built. `sf-data` adds `Locators.ts` | That server alone. A fix to a copied helper is made in each server that has it |
| `protocol/` | The API between the backend and the browser app: the question endpoint, the streamed events, and the citation schema the browser renders | The backend and the browser app |
| `shared/node-config/` | Reading a node's configuration: `ConfigFileError`, YAML files decoded with a `Schema`, and `dotEnv(path)`, the `.env`-first configuration provider and its `load`, which each server's one configuration module (`SfDataServerConfig.ts`, `SfDocsServerConfig.ts`) uses to read its environment variables into services | Every TypeScript node, installed as a library; plumbing, not a contract between nodes |

**Optional parameters.** Models often send `null` for a parameter they leave unset, which a plain optional field rejects, so the call fails and the model retries. Every optional tool input is an `OptionalParam`: its published schema allows `null`, and `null` decodes as not given.

Each server defines it in its own `Params.ts` ([data](../../san-francisco/mcp-servers/data/src/Params.ts), [docs](../../san-francisco/mcp-servers/documents/src/Params.ts)).

**Citations.** Every tool result carries the citations behind it in its `structuredContent` (see [Tool results](agent-loop.md#tool-results)). A citation is either a passage from a document (a law, a report or a reference), from `sf-docs`, or a dataset query, from `sf-data`. Every citation carries two stable IDs, assigned by the tool that returns it, and namespaced by the server's short name so they stay unique across servers without coordination:

- **`sourceId`** names one version of a source: `sf_docs.<documentId>@<versionDate>` for a document (`sf_docs.rent_ordinance@2026-06-29`), `sf_data.<datasetKey>@<sourceVersion>` for a dataset (`sf_data.development_pipeline@2026-08-28`). Every citation of the same dataset or PDF version, from any call, has the same `sourceId`.
- **`citationId`** names the part of that source a claim rests on: `<sourceId>#<provision>` for a document (`sf_docs.rent_ordinance@2026-06-29#37.9(a)(8)`), `<sourceId>#<queryKey>` for a dataset. `queryKey` is the first 16 hex characters of the SHA-256 of the tool name and its decoded parameters as canonical JSON (keys sorted, absent optional fields omitted), so the same query always gets the same ID.

Both IDs are derived from the citation's own fields, so they are the same across calls, requests, model configurations and evaluation runs. Each server's citation schema rejects a citation whose `citationId` is not under its `sourceId`, or whose `sourceId` does not end with its `version`, and each server's tests decode every citation its tools return with it. The model reads and writes short keys (`C1`, `C2`, …) in place of these IDs, which the backend expands to the full `citationId` (see [Citations in answers](agent-loop.md#citations-in-answers)).

| Field | Document (`sf-docs`) | Dataset (`sf-data`) |
|---|---|---|
| Identity | `sourceId`, `citationId` | `sourceId`, `citationId`, whose part is the query key |
| Which part | `locator`: the provision, as "Sec. 37.9(a)(8)" for a law; `quote`: the passage's text, or an outline entry's summary | `locator`: what the query selected, in words, built from the tool's parameters only ("Planning pipeline projects, with status BP Filed, in Mission"); `quote` is null |
| Which version | `version`: the "amended through" or effective date | `version`: the dataset's `rowsUpdatedAt` or the layer's edit date, as `YYYY-MM-DD` |
| Where it came from | `title`, `publisher`, `sourceUrl` (the copy loaded and quoted) | `title`, `publisher`, `sourceUrl`; the license is returned by `dataset_info` |
| The server's own | `documentType` (`law`, `report` or `reference`), so the model can label a report as analysis; the backend ignores it | None |

The tool and parameters behind a dataset citation are not in the citation: a reader checks the locator against the source, and the trace keeps the tool call that produced each citation.

**The archived file's hash is not in the citation.** Users can only open the publisher's live link (`sourceUrl`), not our archive, so the hash would cost the model tokens in every tool result without anything a user could check. It stays in the raw schema's `load_manifest` (`raw_sf_data`, `raw_sf_docs`), where `sourceId` leads to the archived file and its hash for reproducing an answer or detecting that the publisher replaced a file. The browser app shows the version cited and notes that the live link may show newer data (see [Browser App Plan](browser-app.md#citations)). Serving archived public-domain files by `sourceId` can be added later without changing the citation.

The backend reads each result's citations by the convention and sends them to the browser app in `Sources`; the browser decodes them with `protocol/`'s `Citation`. Neither server imports `protocol/`.

Each server's citation schema and ID builders are in its own `Citations.ts` ([data](../../san-francisco/mcp-servers/data/src/Citations.ts), with its locators in [`Locators.ts`](../../san-francisco/mcp-servers/data/src/Locators.ts); [docs](../../san-francisco/mcp-servers/documents/src/Citations.ts)).

**Tool errors.** Returned to the model as results (`failureMode: "return"`), so it can correct its call or say there is no data. Each server defines the three below in its own `ToolErrors.ts`; errors specific to one server's tools (such as `PeriodOutOfRange` for eviction counts) are defined with those tools.

- `UnknownValue` always lists the valid values.
- `DatabaseUnavailable`: the server could not connect or log in to its database (`ConnectionError` or `AuthenticationError` from `effect/sql`). The same call may succeed later. By the tool-error convention, the backend treats it as the server being unavailable: the lookup's outcome is `unavailable` and the server is listed in `Complete.unavailableServers`.
- `DataUnavailable`: the database was reached, but the data the tool reads is not loaded (a dataset with no load, a zone with no row) or could not be read (any other query failure, or rows that do not decode). It names the datasets the tool reads.

A database failure is never a defect: `withDataErrors`, passed to each handler's `Effect.fn`, turns `SqlError` and `SchemaError` into one of the two, and logs the cause for whoever runs the server.

Each server defines them in its own `ToolErrors.ts` ([data](../../san-francisco/mcp-servers/data/src/ToolErrors.ts), [docs](../../san-francisco/mcp-servers/documents/src/ToolErrors.ts)).

## Data server tools

Fixed tools, each backed by a tested dbt model or query. Servers name tools without a prefix; the agent's directory file gives each server its prefix (`sf_data_`), and `McpClient.toolkit(client, prefix)` applies it, so the model sees `sf_data_development_pipeline_projects`. Each tool also publishes a title (`Tool.Title`, sent as the MCP tool's `annotations.title`), which the browser app shows for each lookup. Phase 1 gives the model seven tools; Phase 2 adds two eviction tools, the allowable rent increase tool and the docs server's three (`sf_docs_search_policy`, `sf_docs_get_provision`, `sf_docs_list_provisions`), for thirteen.

| Tool (as the model sees it) | Phase | Answers | Errors |
|---|---|---|---|
| `sf_data_development_pipeline_projects` | 1 | Which projects are at a stage, since when, and with how many affordable units | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_development_pipeline_summary` | 1 | Totals by status, neighborhood, district or year of approval | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_affordable_pipeline_projects` | 1 | Which MOHCD projects, with units by income band and estimated dates | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_affordable_pipeline_summary` | 1 | Projects and affordable units by status, construction stage, neighborhood or district | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_affordable_pipeline_units_by_income_band` | 1 | Units in each income band, and how many projects have units in it | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_project_hazard_exposure` | 1 | Which projects from either pipeline sit inside one flood or exposure zone, and how many units they hold | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_dataset_info` | 1 | How current each dataset is, its license, and the publisher's own description of it | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_eviction_notice_counts` | 2 | How many notices, when, where, for which grounds; a period with no notices returns zero counts | `UnknownValue`, `PeriodOutOfRange`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_eviction_grounds` | 2 | Which grounds the data records, each with the reason and Rent Ordinance section the Rent Board's annual eviction report gives for it | `DatabaseUnavailable`, `DataUnavailable` |
| `sf_data_allowable_rent_increase` | 2 | The annual allowable rent increase in effect on a date, or the latest published, and optionally every period since a year | `DateOutOfRange`, `DatabaseUnavailable`, `DataUnavailable` |

**"Is it moving" is a filter, not a label.** `development_pipeline_projects` returns each project's status date and days in that status, counted to the snapshot's source version (the date its rows were published, which its citation carries) rather than to today, so the same query gives the same number for as long as the snapshot is current; it takes `inStatusSinceBefore` and `approvedBefore`, so a question such as "approved before 2020 and not yet under construction" is answered from the data. No tool decides what counts as stalled.

**One field, one meaning.** Units by income band have their own tool rather than a `groupBy` value of `affordable_pipeline_summary`: summing a project's affordable units into each band it has units in would count it several times, and band totals are a different quantity (`unitsInBand`) from project totals (`affordableUnits`).

**One snapshot per call.** A tool that reads the development pipeline reads the latest snapshot once, then filters every query behind its answer by that value, so the rows, the validation values and the `snapshot` it reports come from the same quarter even if dbt loads a new one meanwhile; dbt keeps every snapshot, so the value read first stays valid. A list tool's total and its rows come from one query (`count(*) OVER ()`), and each call reads the dataset list once for its citations.

**Inputs are validated against the data, not the schema.** Neighborhood names, districts, statuses and grounds are plain strings in the schema and are checked against the loaded reference tables, so new values in the source need no contract change. Field descriptions, not patterns, reach the model: Effect's tool JSON Schema carries each field's `description` but not its `isPattern` check, so formats such as `YYYY-MM` are stated in the description and enforced on decode.

**Limits of the data are stated three ways, none of them prose in config:**

- **Facts about the data are typed fields**, computed from the data: `snapshot`, `dataAsOf`, `statusSince` (null for the few projects without one), `projectsWithoutLocation`, a zone's `sourceEditedAt`, and dates named as estimates (`estimatedConstructionStart`).
- **The publisher's own caveats are loaded from the source.** Each loader archives the dataset's metadata, and `dataset_info` and `project_hazard_exposure` return the publisher's description verbatim, as a citable quote. DataSF's descriptions already state the main limits, for example the Eviction Notices dataset's "A notice of eviction does not necessarily indicate that the tenant was eventually evicted". Where a description is known to be stale (MOHCD's says "as of September 30, 2023"; the SFPUC zone layer's says July 1, 2022), the typed version fields are the authority, and the answer says the description is older than the data.
- **How to read a result is part of the tool's description**, in code, reviewed like code: for example, that counts by ground do not sum to the total, or that zones are never combined. The model reads these when it chooses the tool.

The answer rules (cite the snapshot, never say "stalled", notices are not evictions) are in these tool descriptions, not the backend's system prompt, which names no city (see [The system prompt](agent-loop.md#the-system-prompt)). The evaluation checks them. If the evaluation shows answers dropping a rule, the fix is a structured flag in the result (for example `countsOverlap: true`), not prose.

The tools' schemas and descriptions are in [`san-francisco/mcp-servers/data/src/Tools.ts`](../../san-francisco/mcp-servers/data/src/Tools.ts).

### Docs server tools (Phase 2)

San Francisco's own server, `sf-docs` in the directory file, with the tool prefix `sf_docs_` (`sf_docs_search_policy`), beside `sf-data`'s `sf_data_`. Each document is loaded in one version, so the tools take no date. Search is vector search with Qwen3-Embedding-4B, through OpenRouter from one pinned host, as [spike S4](spikes/s4-embeddings.md#decision) decided: the MVP plan's hybrid search added nothing over vector search on Chapter 37 with any model tried, and S4 left keyword search for exact terms (section numbers, named acts) as an open question. When the embedding model cannot be reached, is served by another host or returns an unusable vector, a search fails with `EmbeddingModelUnavailable` rather than falling back; `get_provision` and `list_provisions` do not need the model. Search is exact: it computes every search entry's distance to the query, which takes milliseconds at a few thousand entries and returns what S4 measured, where an HNSW index scan would return at most `hnsw.ef_search` entries (40 by default). With no limit given, it returns 10 provisions, the depth S4's threshold is set at. The server is built in [`san-francisco/mcp-servers/documents/`](../../san-francisco/mcp-servers/documents/README.md), beside `data/`, and shares only the database with the passage pipeline in [`san-francisco/ingest/documents/`](../../san-francisco/ingest/documents/README.md): each has its own `config/search.yaml`, and the server checks at startup that its model and host are the ones stored with every search entry.

**The model learns what the corpus covers from the tool list.** A tool description that names no place, subject or document leaves the model unable to tell that Chapter 37 ("Residential Rent Stabilization and Arbitration Ordinance") covers rent control, so the server reads `sf_docs.documents` at startup and writes the corpus into its tool descriptions: `search_policy` lists each document's ID, type and a description of what it covers, and tells the model to search before saying the documents cannot answer; `get_provision` and `list_provisions` list the document IDs, so the model can browse a document without searching first. **No tool description holds a digit**: a model repeats what a description says without a citation, so titles and versions stay out of the listing, the corpus descriptions hold no digits (`corpus.py` rejects one), and each server's tests check its tool descriptions and schemas for digits. Each description is declared in `config/corpus.yaml`, worded from the document itself (Chapter 37's is drawn from its own phrase "the rent control provisions of this Chapter 37", in Sec. 37.3, and its table of contents), and stored in `sf_docs.documents.description` (migration 0002). The listing costs no extra model turn, unlike a `list_documents` tool the model would have to call first. A corpus change needs the server restarted, then the backend, which lists each server's tools when it connects. The system prompt has the matching city-neutral rule (see [The system prompt](agent-loop.md#the-system-prompt)).

**A provision often means little without its parent or its children.** 37.9(a)(8)(ii) ("For the use or occupancy of the landlords grandparents…") is a ground for eviction only because of the lead-ins of 37.9(a) and 37.9(a)(8) above it; 37.9(a) ("A landlord shall not endeavor to recover possession of a rental unit unless:") holds nothing until its 17 children. Search finds the right part of a document, and three things let the agent move from there to the provision that answers:

- **Every passage carries its place in the tree.** Search results and `get_provision` return each passage with its `context` (the section heading and its ancestors' lead-ins), its `parentProvision` and its `childCount`, so a hit that is only a lead-in shows that its children hold the substance.
- **`get_provision` returns a provision's own text and an outline of its children**, and the agent asks for each child whose full text it needs, so answers still quote and cite the exact subsection. Each outline entry is cited by its summary, as in `list_provisions`. A provision is never returned with its descendants, since each passage repeats its ancestors' text as `context` and each citation quotes its passage, which makes a subtree's result several times the size of its text.
- **`list_provisions` browses a document:** its sections, or one provision's children, as an outline. A broad question ("What are the grounds for eviction?") is answered by listing 37.9(a)'s children rather than by hoping search ranks all 17.

An outline lists each child's number, its summary (a section's heading, or the first sentence of any other provision's text) and its own number of children. The passage pipeline computes each passage's summary and stores it in `sf_docs.passages.summary`; the server builds outlines from the stored summaries, and the pipeline builds the outline search entries from the same column, so search and browsing summarize a provision the same way. Outlines are for navigation: each entry carries a citation quoting its summary, which is verbatim (a heading or a first sentence), so the agent can name what it listed; an answer about what a provision says quotes its full text from `get_provision` or search.

The tools' schemas and descriptions are in [`san-francisco/mcp-servers/documents/src/Tools.ts`](../../san-francisco/mcp-servers/documents/src/Tools.ts).

Whether the chat model uses `get_provision` and `list_provisions` well is measured end to end in the evaluation (P3.1), not by S4, which scores search alone.

## Database schemas

Three Neon projects (see [Data servers](#data-servers)), each with its own schemas; `sf-docs` is created in Phase 2. Column names in the raw schemas are the source's own field names, read from each dataset's DataSF metadata (`https://data.sf.gov/api/views/<id>.json`).

| Neon project | Schema | Written by | Migrations | Read by |
|---|---|---|---|---|
| `sf-data` | `raw_sf_data` | Data ingestion loaders | Alembic (raw SQL) | dbt |
| `sf-data` | `sf_data` | dbt | dbt | `sf-data` server (role `sf_data_reader`) |
| `sf-docs` (Phase 2) | `raw_sf_docs` | Documents ingestion loaders | Alembic (raw SQL) | Passage pipeline |
| `sf-docs` (Phase 2) | `sf_docs` | Passage pipeline | Alembic (raw SQL) | `sf-docs` server (role `sf_docs_reader`) |
| `app` | `app` | Backend | Drizzle (`backend/drizzle/`) | Backend, evaluation reports; see [The `app` schema](agent-loop.md#the-app-schema) |

Each reader role has `USAGE` on its schema and `SELECT` on its tables, and nothing else.

### Raw schemas (`raw_sf_data`, `raw_sf_docs`)

Every load writes one manifest row and its data rows in one transaction. Both raw schemas have the same manifest, `load_manifest`: the source's key, URLs and version, the archived data and metadata with the data's SHA-256, the license, title, publisher and description from the metadata, the row count and the loader's commit. They are defined in each ingest project's first migration ([data](../../san-francisco/ingest/data/migrations/versions/0001_raw_sf_data_and_sf_data_schemas_and_the_.py), [documents](../../san-francisco/ingest/documents/migrations/versions/0001_raw_sf_docs_and_sf_docs_schemas_and_the_.py)).


Each raw table has the same four columns: `load_id`, `row_number`, `record` (the source row as `jsonb`, keyed by the source's own field names) and `geom` (the parsed geometry for GeoJSON sources, in EPSG:4326). Keeping the whole row as `jsonb` means no source column is dropped or retyped at load, and dbt reads fields with `record ->> 'field'`. A load whose data hash matches an earlier load of the same source is skipped. The loaders are in [`san-francisco/ingest/data/`](../../san-francisco/ingest/data/README.md) and [`san-francisco/ingest/documents/`](../../san-francisco/ingest/documents/README.md).

| Table | Phase | Source | Fields used downstream |
|---|---|---|---|
| `raw_sf_data.development_pipeline` | 1 | `6jgi-cpb4` | `blklot`, `case_no`, `nameaddr`, `current_status`, `current_status_date`, `approved_date_planning`, `net_pipeline_units`, `pipeline_affordable_units`, `bmr_units_ex_low`, `bmr_units_very_low`, `bmr_units_low`, `bmr_units_moderate`, `nhood41`, `sd22`, `latitude`, `longitude`; the snapshot quarter, read from the metadata's description ("as of the end of 2026 Q2") |
| `raw_sf_data.affordable_pipeline` | 1 | `aaxw-2cb8` | `project_id`, `project_name`, `project_status`, `construction_status`, `housing_tenure`, `city_analysis_neighborhood`, `supervisor_district` (text in the source), `total_project_units`, `mohcd_affordable_units`, the AMI columns (`_20_ami` … `_150_ami`, `ami_undeclared`), `estimated_actual_construction_start_date`, `estimated_construction_completion`, `planning_case_number`, `block`, `lot`, `latitude`, `longitude` |
| `raw_sf_data.analysis_neighborhoods` | 1 | `j2bu-swwd` | `nhood` |
| `raw_sf_data.slr_66in_100yr_storm` | 1 | `6ann-usi8` | geometry → `geom` |
| `raw_sf_data.sfpuc_100yr_storm` | 1 | SFPUC FeatureServer layer 2 | `objectid`, `acres`, geometry → `geom` |
| `raw_sf_data.air_pollutant_exposure_zone` | 1 | `t65d-x6p8` | geometry → `geom` |
| `raw_sf_data.eviction_notices` | 2 | `5cei-gny5` | `eviction_id`, `file_date`, the 19 ground flags (`non_payment` … `good_samaritan_ends`, the dataset's true-or-false fields), `neighborhood`, `supervisor_district`, `shape` |
| `raw_sf_data.eviction_report` | 2 | The annual eviction report PDF | One row per page: `page`, `text` |
| `raw_sf_data.allowable_rent_increase` | 2 | `hsxb-ci7b` | `effective_starting_date`, `annual_allowable_increase` |
| `raw_sf_docs.document_pages` (`sf-docs`) | 2 | Each document PDF in `san-francisco/ingest/documents/config/sources.yaml`, which names this shared table (`raw_table`) | `page`, `text`; a row's document is its load's `source_key` in the manifest |
| `raw_sf_docs.ca_code_sections` (`sf-docs`) | 2 | Legislature bulk download | The section's code, number, heading, text and the bulk file's own version fields, named as in the bulk file |

### `sf_data` (dbt models)

| Model | Phase | Grain | Columns | Tests |
|---|---|---|---|---|
| `neighborhoods` | 1 | One per analysis neighborhood | `name` (PK) | Unique, not null |
| `development_pipeline` | 1 | One per project in the snapshot | `project_key` (PK with `snapshot`: parcel, Planning case and permit application), `block_lot`, `name_or_address`, `status`, `status_since`, `planning_approved_on`, `net_units`, `affordable_units`, `units_extremely_low` … `units_moderate`, `neighborhood` (FK, nullable, names converted to the official spelling), `supervisor_district` (int, cast from text), `geom geometry(Point, 4326)` (nullable), `snapshot`, `source_version` (the snapshot load's source version, from the manifest), `load_id` | Unique per snapshot; status values are the six documented ones after mapping `BP BP Issued`; no project's `status_since` is later than its `source_version`, since days in a status are counted to it; a warning test lists projects whose affordable units by level do not sum to `affordable_units` |
| `affordable_pipeline` | 1 | One per project | `project_id` (PK), `name`, `status`, `construction_status`, `neighborhood` (FK), `supervisor_district` (int, cast from text), `total_units`, `affordable_units`, `estimated_start`, `estimated_completion`, `geom geometry(Point, 4326)`, `load_id` | Unique; every project has a location, or the build fails |
| `affordable_pipeline_ami_units` | 1 | One per project and income band | `project_id`, `ami_band` (the source column name), `units` | Bands are an unpivot of the source's AMI columns; zero-unit rows are dropped |
| `zones` | 1 | One per flood or exposure zone | `zone` (PK: `slr_66in_100yr_storm`, `sfpuc_100yr_storm`, `air_pollutant_exposure_zone`), `name`, `publisher`, `source_edited_at`, `publisher_description`, `geom` (polygons repaired with `ST_MakeValid`, then merged), `load_id` | Name, publisher, edit date and description come from each source's archived metadata; the zone key is the source's key in `san-francisco/ingest/data/config/sources.yaml` |
| `project_zone_exposure` | 1 | One per project, source and zone it falls inside | `project_source` (`development_pipeline` or `affordable_pipeline`), `project_id`, `zone` | `ST_Intersects`, for the latest pipeline snapshot; tests pin synthetic projects inside and outside a zone |
| `datasets` | 1 | One per loaded dataset | `dataset_key`, `title`, `publisher`, `source_url`, `license`, `source_version`, `publisher_description` | Built from the latest manifest row per source and its archived metadata |
| `eviction_report_grounds` | 2 | One per reason in the latest report's table | `reason`, `section` (null for "other or no reason given"), `page`, `load_id` | Reasons unique; a warning lists reasons no ground column records |
| `eviction_grounds` | 2 | One per ground flag in the latest Eviction Notices load | `ground_key` (the source column name), `label` (the report's reason), `section` (nullable), `report_load_id` | Unique; every ground has a reason found in the report |
| `eviction_notices` | 2 | One per notice | `eviction_id` (PK), `file_date`, `file_month`, `neighborhood` (FK → `neighborhoods`, nullable), `supervisor_district` (int, nullable), `geom` (nullable), `load_id` | Unique; neighborhoods not in `neighborhoods` fail the build |
| `eviction_notice_grounds` | 2 | One per notice and ground it gives | `eviction_id` (FK), `ground_key` (FK) | A notice with no ground flag is kept in `eviction_notices` and listed by a warning, not dropped silently |
| `allowable_rent_increases` | 2 | One per period | `effective_from` (unique), `effective_to` (the day before the next period; for the latest, the day before the next March 1, since the dataset's description says rates "are effective every year on March 1"), `percent`, `load_id` | `effective_from` unique; every rate within 0% to 7%, the cap in Sec. 37.3(a)(1) |

**Snapshots are kept.** `development_pipeline` keeps every loaded quarter, keyed by `snapshot`, so later loads can show movement between quarters. Phase 1 loads the current public quarter; past quarters are available only from the dataset owner (see [Open questions](#open-questions)).

`eviction_notice_counts` aggregates `eviction_notices` and `eviction_notice_grounds` at query time with fixed, parameterized SQL; the dataset is small enough that it needs no pre-aggregated models.

### `sf_docs` (Phase 2)

Defined in the documents ingestion's [migrations](../../san-francisco/ingest/documents/migrations/versions/): `documents` (one row per corpus document: its type, the description shown in the tool listing, publisher, version date, source URL and load), `passages` (one per provision: its number, parent, section heading, order, `context`, own `text` and `summary`, and a `tsv` column) and `search_entries` (the text embedded for each provision and kind, its `halfvec(2560)` embedding and the model and host that made it). The first migration creates all three; the second adds `documents.description`.

**A passage is searched with its context.** Chapter 37's provisions often make sense only with the lead-in above them: 37.9(a)(8) reads "The landlord seeks to recover possession in good faith…", and only 37.9(a) says this is a ground a landlord may evict on. Each passage stores its own `text`, which answers quote, and a `context` of its section heading and its ancestors' lead-in text, which search indexes with it, so a question about evicting for owner move-in finds 37.9(a)(8). Each passage's `own` search entry embeds the section heading, the nearest ancestor's lead-in and the text. The `tsv` column over the full context is kept for keyword search, which the server does not run (S4's open question 1).

**Embeddings are on search entries, not passages.** Spike S4 chose `subtree` entries: one per passage (the section heading, its nearest ancestor's lead-in and its text) and one per provision with children (its descendants' text up to 10,000 characters, or an outline of its children above that). `search_entries` has an HNSW index, which the server's exact search does not use at this size; the passage pipeline derives the entries from `passages`, and a search ranks each provision by its best entry. `passages` keeps each provision's own text for quoting. The server checks at startup that its configured embedding model matches the stored one.

**How embeddings are made** is set by [spike S4](spikes/s4-embeddings.md#decision) and described in the documents ingestion's [Embedding model](../../san-francisco/ingest/documents/README.md#embedding-model): the pipeline and the server call the same model from the same pinned host, and each entry stores the model and host.

## Ingestion for San Francisco

Python, in [`san-francisco/ingest/data/`](../../san-francisco/ingest/data/README.md) and [`san-francisco/ingest/documents/`](../../san-francisco/ingest/documents/README.md), built on the shared library in [`shared/ingest/`](../../shared/ingest/README.md) and following the provenance rules in [CLAUDE.md](../../CLAUDE.md):

| Loader | Phase | Archive | Raw tables | Notes |
|---|---|---|---|---|
| DataSF datasets | 1 (pipelines, zones, neighborhoods); 2 (evictions) | Each full export (CSV or GeoJSON) and the dataset's metadata (`/api/views/<id>.json`) | One `raw_sf_data` table per dataset; the metadata's name, attribution and description in `raw_sf_data.load_manifest` | Source version is the dataset's `rowsUpdatedAt` |
| SFPUC flood map | 1 | GeoJSON export of the 2024 update's zone layer (layer 2) and the layer's JSON metadata | `raw_sf_data.sfpuc_100yr_storm` | Source version is the layer's edit date |
| PDF documents (`kind: pdf` in `sources.yaml`) | 2 (the annual eviction report in `sf-data`; the corpus documents in `sf-docs`) | Each PDF, and a metadata file holding the PDF's own information record and the printed date matched | `raw_sf_data.<source key>`, or the shared table the source names with `raw_table` (`raw_sf_docs.document_pages` for the corpus), one row per page of text extracted by pypdf | Title and publisher are declared as printed in the document, since PDFs rarely carry them. Source version is the date printed in the document: `version_pattern` must match it exactly once or the load fails. |
| California statutes | 2 | The bulk database file | `raw_sf_docs.ca_code_sections` | Only sections listed in the corpus file are loaded; source version is the bulk file's date |

The dbt models are listed in [Database schemas](#sf_data-dbt-models).

The passage pipeline (Phase 2) splits each law at its section headings and then at subsections ("Sec. 37.x" for Chapter 37; "SEC." headings in the ordinances), the California sections at section and subdivision, and reports at the headings their contents page lists, then by page. Each passage keeps its provision or heading, version and source. The San Francisco corpus is English, so no translation step runs.

The pipeline lives in `san-francisco/ingest/documents/`, with the corpus (`config/sources.yaml` for fetching, `config/corpus.yaml` for each document's type and splitting rule), the `raw_sf_docs` and `sf_docs` migrations and the `sf-docs-ingest` command. `src/sf_docs_ingest/passages/` splits a section into passages along its enumerated subsections ((a), (1), (A), (i), (I)), summarizes them, builds and embeds their search entries and writes them; the rules for each document's layout are beside it (`rent_ordinance.py`). It is San Francisco's own: Dutch law does not number its provisions this way. `sf-docs-ingest ingest` loads the PDFs and `sf-docs-ingest passages` rebuilds each document's passages from its latest load.

Each document's layout rules are code with tests, beside the pipeline: [`rent_ordinance.py`](../../san-francisco/ingest/documents/src/sf_docs_ingest/rent_ordinance.py) for the Rent Board's copy of Chapter 37 (page furniture removed, sections checked against its contents page, subsections nested as the text numbers them, source errors kept rather than corrected) and [`bla_affordable_housing.py`](../../san-francisco/ingest/documents/src/sf_docs_ingest/bla_affordable_housing.py) for the Budget and Legislative Analyst's report (sections from its contents page, then one passage per page of each section). A layout the rules do not expect fails the build rather than merging or dropping text.

## How this extends to the Netherlands

The San Francisco build sets patterns that the Dutch product reuses unchanged:

- **Stable source and citation IDs**, built from each citation's own fields, work unchanged for Dutch sources.
- **Added when the Netherlands needs them:** a jurisdiction on citations and tool inputs (for a server covering several municipalities), and a language and machine-translation label on document citations. Both are additive.
- **Each city's documents are its own.** The Dutch corpus gets its own documents ingestion, with a translation step, and its own docs server, `nl-docs`, with a schema and tools fitted to Dutch documents. San Francisco's passage pipeline follows American legal numbering and is not shared; what carries over is the citation convention and the patterns in this plan.
- **Data servers by source, with the place as a parameter**, rather than one server per city, once more than one place shares a source.
- **The agent loop and API are place-independent.** Adding the Netherlands adds servers to the directory file.

## Browser app

The browser app is the same for every city; its plan, including how tool calls and citations are shown, is the [Browser App Plan](browser-app.md).

## Milestones

Phase 1, the eviction and rent-increase tools, and the docs server over Chapter 37 and the Budget and Legislative Analyst's report are built. What remains:

| Phase | Milestone | Done when |
|---|---|---|
| 2 | P2.1 Ordinances | The inclusionary, all-electric and Article 38 ordinances and the pipeline data dictionary loaded into `sf-docs`, once their enacted text can be extracted without repealed wording. |
| 2 | P2.2 State statutes | The California Tenant Protection Act and Costa-Hawkins sections loaded from the Legislature's bulk download. |
| 3 | P3.1 Evaluation | The San Francisco questions run against `open_cloud` and `frontier`, with answers checked by the San Francisco reviewer. |

## Next steps

- **Cache reference data in `sf-data`.** Each tool call reads the dataset list, the latest snapshot and the values it validates inputs against (statuses, neighborhoods, districts) before its main query, each a round trip to Neon. These change only when a load runs, so the server could cache them per process, refreshed on a short interval or when a dataset's `source_version` changes, leaving one query per call. Counts and lists already come from one query (`count(*) OVER ()`).

## Open questions

1. **Who checks San Francisco answers?** The research team is focused on the Netherlands. A reviewer with San Francisco housing knowledge is needed for the evaluation set, ideally from a policy office or a tenant organization.
2. **Past pipeline quarters.** Planning retired its earlier quarterly snapshots from DataSF as of 2024 Q3; the dataset's description says to ask the dataset owner for them. Until they arrive, the plan uses the current public quarter.
3. **Enacted inclusionary text.** Confirm the enacted ordinance number and final text for Board File 260538 before loading it.
4. **Rent Board Housing Inventory.** Add it after Phase 2, for "is my unit covered" and rent-band questions?

## References

- Research reports: [SF housing policy tools landscape](../research/reports/SF%20housing%20policy%20tools%20landscape.md), November 3, 2026; [SF affordable housing challenges](../research/reports/SF%20affordable%20housing%20challenges.md), November 4, 2026
- DataSF: SF Development Pipeline <https://data.sf.gov/d/6jgi-cpb4>; MOHCD Affordable Housing Pipeline <https://data.sf.gov/d/aaxw-2cb8>; 100-year storm + 66 inches SLR <https://data.sf.gov/d/6ann-usi8>; Air Pollutant Exposure Zone <https://data.sf.gov/d/t65d-x6p8>; Analysis Neighborhoods <https://data.sf.gov/d/j2bu-swwd>; Eviction Notices <https://data.sf.gov/d/5cei-gny5>
- SF Planning pipeline report and data dictionary: <https://sfplanning.org/project/pipeline-report>
- SFPUC flood maps: <https://www.sfpuc.gov/learning/emergency-preparedness/flood-maps>; 2024 update service: <https://gis.sfpuc.org/server/rest/services/Hosted/100_Year_Storm_Flood_Risk_Map_2024_Update/FeatureServer>
- Board File 260538 (inclusionary updates): <https://sfgov.legistar.com/View.ashx?GUID=40004122-9FEB-4E0C-A67B-2126814C08E5&ID=15691706&M=F>
- Ordinances 174-25 and 186-25: <https://www.sfbos.org/sites/default/files/o0174-25.pdf>; <https://www.sfbos.org/sites/default/files/o0186-25.pdf>
- Budget and Legislative Analyst, Financing Affordable Housing (June 5, 2026): <https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf>
- Rent Ordinance (Rent Board copy): <https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf>; amendments list: <https://media.api.sf.gov/documents/601_List_of_Ord_Amendments_6-29-26.pdf>
- San Francisco Administrative Code (official): <https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-15928>
- SFMOCI openlaw repository: <https://github.com/SFMOCI/openlaw>
- California Legislature bulk downloads: <https://downloads.leginfo.legislature.ca.gov/>
- Neon Postgres extensions: <https://neon.com/docs/extensions/pg-extensions>
