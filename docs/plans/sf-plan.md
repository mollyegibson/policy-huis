# PolicyHuis: San Francisco Plan

Draft, November 3, 2026; revised November 4, 2026.

This plan covers the San Francisco build: its sources and its MCP servers. The agent loop that every city's servers plug into is in the [Agent Loop Plan](agent-loop.md). It builds on the [MVP Technical Plan](mvp-technical-plan.md), which remains the reference for the shared architecture (one agent, independent MCP servers, the shared contract, the data layer, the network, evaluation and energy). Where this plan is more specific, this plan wins for San Francisco.

## Summary

- **Focus:** San Francisco's affordable housing pipeline. Two questions run through the demo: *where is it, and is it moving?* and *is it climate-ready?* The research behind this choice is in [*SF affordable housing challenges*](../research/reports/SF%20affordable%20housing%20challenges.md) (November 4, 2026): money, not zoning, now holds projects back, and the figures cited in public debate are often real dataset totals with misleading labels, which is where cited answers help most.
- **Users:** policy makers and residents. One answer style for now; the API is designed so an audience attribute can be added later without breaking callers.
- **Phase 1, prototype:** the two project pipelines (Planning's and MOHCD's), two flood maps and the air-pollutant exposure zone, served by `sf-housing`, answered through the agent loop and shown in a simple web app. Answers cite datasets only.
- **Phase 2, rules and evictions:** the legal-text server, with the inclusionary, all-electric and air-quality ordinances and the analysis reports that explain stalls, then the Rent Ordinance, the California tenant-protection statutes and the Eviction Notices dataset with its tools.
- **Phase 3, evaluation:** the San Francisco questions run against the three model configurations.
- **Servers:** one San Francisco data server (see [Data servers](#data-servers)), and from Phase 2 the shared legal-text server with a San Francisco corpus.
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
| Rule (state) | "Does the state rent cap apply if my unit is under San Francisco rent control?" | "How does the Tenant Protection Act interact with local rent control?" | Civil Code sections from the Tenant Protection Act; Costa-Hawkins |
| Ground | "How many eviction notices were filed in my neighborhood last year?" | "Which eviction grounds account for most notices since 2020, by supervisor district?" | Eviction Notices |
| Rule + data | "What is an owner move-in eviction, and how common is it in the Mission?" | "Which approved projects in the air-pollutant exposure zone will need enhanced ventilation?" | Ordinances with either dataset |

These extend the San Francisco questions in [Provisional Questions](provisional-questions.md) and the question list in the research report, and will be reviewed with whoever checks San Francisco answers (see [Open questions](#open-questions)).

### Leaving room for an audience attribute

The first request schema carries only the question. Adding an audience later is an additive change:

- The request gains an optional `audience` field (for example `resident` or `policy_maker`). Callers that omit it get today's behavior.
- The agent selects a system prompt variant by audience; prompts are versioned files, and each trace records the variant and version used.
- The evaluation set tags each question with its audience, so scores can be split by audience once the field exists.

Nothing in Phase 1 or 2 branches on audience, so adding it touches the request schema, prompt selection and evaluation tagging only.

## Sources

Checked on November 3 and 4, 2026. DataSF moved from `data.sfgov.org` to `data.sf.gov`; old links redirect.

**Publicly available sources only.** This is a demo, so it uses sources the city and state publish openly and does not seek reuse permissions. Every citation names the publisher and links to the source, and each dataset's stated license (or the absence of one) is recorded with the load and returned by `sf_dataset_info`.

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

**The two pipelines overlap only in part.** On November 4, 2026, 79 of MOHCD's 190 projects matched a Planning pipeline project by Planning case number or by block and lot (after padding lot numbers to MOHCD's format), so the two cannot be merged into one project list. Phase 1 serves them as two sources with their own tools, and says which one an answer comes from. A tested crosswalk between them is a later addition.

**Hazard maps answer different questions.** The sea-level-rise layer is an extreme planning scenario: the city's disclaimer for its 108-inch zone calls that scenario "very, very unlikely", and the modelling rests on 2010 ground conditions. The SFPUC map covers stormwater only. The air-pollutant exposure zone triggers a building requirement and is not a hazard map. Tools return results per zone, with each zone's name, date and limits, and never merge them into one "risk" answer.

### Phase 2 documents

The legal-text server's corpus holds laws and the analysis reports that explain them. Each citation carries a `documentType` (`law`, `report` or `reference`), and answers label reports as analysis, not rules.

| Document | Publisher | Access | Type | As of | Notes |
|---|---|---|---|---|---|
| Inclusionary Housing Program updates and impact fee reductions (Board File 260538) | Board of Supervisors, [Legistar](https://sfgov.legistar.com/View.ashx?GUID=40004122-9FEB-4E0C-A67B-2126814C08E5&ID=15691706&M=F) | PDF, 195 pages | Law | Amended in Board July 14, 2026 | Amends the Planning Code, including Section 415. The research reports enactment as Ordinance 136-26, effective August 22, 2026, but `sfbos.org` returned 404 for that ordinance PDF on November 4, so the enacted text and number are confirmed before loading. |
| All-electric major renovations (Ordinance 174-25) | Board of Supervisors, [sfbos.org](https://www.sfbos.org/sites/default/files/o0174-25.pdf) | PDF | Law | 2025 | 100% affordable projects are exempt until July 1, 2027, per the research. |
| Article 38 enhanced ventilation amendments (Ordinance 186-25) | Board of Supervisors, [sfbos.org](https://www.sfbos.org/sites/default/files/o0186-25.pdf) | PDF | Law | 2025 | Effective date unconfirmed. |
| Financing Affordable Housing | Budget and Legislative Analyst, [sf.gov](https://media.api.sf.gov/documents/BLA_Financing_Affordable_Housing_060526.pdf) | PDF | Report | June 5, 2026 | Costs per unit, funding sources and the funding gap. |
| Housing Production and Development Pipeline, 2026 Q2 | SF Planning, [sfplanning.org](https://sfplanning.org/sites/default/files/documents/reports/Housing_Production_Development_Pipeline-2026Q2.pdf) | PDF | Report | 2026 Q2 | The narrative behind the `6jgi-cpb4` snapshot. |
| Pipeline data dictionary | SF Planning, [sfplanning.org](https://sfplanning.org/sites/default/files/documents/reports/pipeline_data_dictionary.pdf) | PDF | Reference | Undated | What each pipeline status means. |
| Rent Ordinance (Administrative Code, Chapter 37) | San Francisco Rent Board | PDF, [sf.gov](https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf), 146 pages, 27 sections (Sec. 37.1 to Sec. 37.16) | Law | Amended through June 29, 2026 | The PDF states it is "not an official record" and that it reflects court decisions and state legislation the official record may not. A separate [list of amendments](https://media.api.sf.gov/documents/601_List_of_Ord_Amendments_6-29-26.pdf) is published alongside. Citations link to this PDF. |
| California Civil Code: Tenant Protection Act sections (1946.2, 1947.12, 1947.13) and the Costa-Hawkins Rental Housing Act (1954.50 and following) | California Legislature | Daily bulk database downloads at [downloads.leginfo.legislature.ca.gov](https://downloads.leginfo.legislature.ca.gov/) | Law | Daily | The exact sections loaded are corpus membership in `san-francisco/legal-text/corpus.yaml`. A 2025 bill (SB 522) proposed amendments to 1946.2 and 1947.12; whether it was enacted is unconfirmed, which is why every load records the version it took. |

American Legal Publishing, the official host of the city's codes, refused automated requests during the research, so code sections come from the enacted ordinances and the Rent Board's copy, and citations link to those. The city's older raw code files on GitHub ([SFMOCI/openlaw](https://github.com/SFMOCI/openlaw)) were last updated in April 2014, so they cannot serve as the source for current law.

The Rent Ordinance PDF's text extracts cleanly. Each section starts with a "Sec. 37.x" heading, and the pleading-paper line numbers (1 to 28) down each page are removed during extraction; the ordinances use the same pleading format.

### Phase 2 data

| Source | DataSF ID | License | Updated | Size and shape | Notes |
|---|---|---|---|---|---|
| Eviction Notices | [`5cei-gny5`](https://data.sf.gov/d/5cei-gny5) | ODC Public Domain (PDDL) | Monthly; rows updated November 6, 2026 | 49,159 notices filed from January 2, 1997 to October 29, 2026; 19 ground flags per notice, block-level address, supervisor district, analysis neighborhood, point location | Notices filed with the Rent Board under Section 37.9(c). A notice is not an eviction. A notice can carry several grounds. A duplicate-row issue was fixed on February 27, 2024. On November 6, 2026: `eviction_id` is unique; every neighborhood name is in the Analysis Neighborhoods list; 96 notices have no neighborhood, 89 no supervisor district and 77 no location; 331 have no ground flag set. |

| Rent Board Annual Report on Eviction Notices, 2025-2026 | San Francisco Residential Rent Stabilization and Arbitration Board, [sf.gov](https://media.api.sf.gov/documents/Rent_Board_Annual_Eviction_Report_25-26_2HGK2Cl.pdf) | None stated | Dated April 8, 2026; yearly, required by Section 37.6(j); past reports listed at [sf.gov](https://sf.gov/information/rent-board-statistics-and-reports) | PDF, 4 pages. Page 2 lists each eviction reason with its "Ordinance Section" (20 reasons, 37.9(a)(1) to 37.9(a)(17), 37.9(b), and "other or no reason given" with no section) | Its introduction describes its data in the same words as the Eviction Notices dataset. It reports that an ordinance effective February 9, 2026 added 37.9(a)(17) (demolition of a whole building for redevelopment) and narrowed 37.9(a)(10) to a single unit; the dataset has no column for (a)(17). |

**Linking eviction grounds to the ordinance.** The dataset names each ground in its own words ("owner move in") and gives no section. The annual eviction report gives each of its reasons with its Ordinance section, so the sections come from the loaded report, never typed by hand: `eviction_report_grounds` parses the report's table. Only the pairing of each dataset column with a report reason is ours, because no source states it: the dbt macro `eviction_ground_reason` pairs them by wording (`owner_move_in` with "owner/relative move-in"), and `eviction_grounds` joins the two. A column with no reason, or a reason missing from the report, fails the build; a report reason with no column (today, 37.9(a)(17)) is listed by a warning. Tools return each ground's label and section as the report gives them and do not sort grounds into categories. On November 6, 2026 the pairing was checked against the 2024-25 and 2025-26 reports and the Rent Ordinance amended through June 29, 2026. Where the pairing has limits:

- The report gives 37.9(a)(1) for both non-payment and habitual late payment; the ordinance's (A) and (B) split is not used.
- A subletting dispute can be filed as `unapproved_subtenant` (37.9(a)(7)) or as `breach` (37.9(a)(2)), and rehabilitation work under 37.9(a)(11) or (a)(12): the landlord's checkbox decides.
- "Other or no reason given" is broader than the dataset's description of `other_cause`.
- Sections (a)(14) to (a)(17) were added after 1997; the section numbering for older notices was not checked.

## Data servers

**One San Francisco data server, `sf-housing`**, holding the housing pipelines, the zones they are checked against and, from Phase 2, the eviction data in one schema. Its code is in `san-francisco/housing-server/`; its sources, migrations and dbt models are in `san-francisco/ingest/`. Code every node reuses (fetching, archiving and loading sources; MCP server setup; citation IDs; the legal-text server) is in `shared/`, installed by each node as a library, so each node still runs on its own device.

The climate question needs a spatial join: which pipeline projects fall inside which zone. Done in the database, that join is one tested query with PostGIS. Split across a housing server and a climate server, the model would have to carry each project's coordinates from one server's result into another server's call, which a small model does unreliably and which no test can pin.

The split is revisited when a climate source covers places beyond San Francisco (for example, national flood maps for several cities, or the Netherlands' national climate layers). A climate server then answers by location for any city, and the city data servers call it at load time, not through the model.

**Neon layout**, following the scope proposal's one-account, project-per-part approach:

| Neon project | Holds | From |
|---|---|---|
| `sf-housing` | Both pipelines, the flood and exposure zones and neighborhoods with PostGIS; eviction notices from Phase 2 | Phase 1 |
| `app` | Traces and evaluation results (shared with every city) | Phase 1 |
| `sf-legal-text` | The ordinances, reports, Chapter 37 and the California sections: passages, embeddings, search indexes | Phase 2 |

Neon supports both extensions needed: PostGIS (3.5.7 on Postgres 17) and pgvector (0.8.0 on Postgres 17), per [Neon's extension list](https://neon.com/docs/extensions/pg-extensions).

## Protocol and shared helpers

Once servers run on their own devices, the only interface between a server and the backend is what the server exposes over MCP: its tool definitions and results. So no schema package is shared between servers and the backend. Three things are shared, for different reasons:

| Package | Holds | Used by |
|---|---|---|
| `protocol/` | The API between the backend and the browser app: the question endpoint, the streamed events, and the citation schema the browser renders | The backend and the browser app, as in the reference project's `protocol` package. Servers produce citations that match its citation schema (published as JSON Schema), without importing it. |
| `shared/mcp-kit/` | Helpers for building MCP servers: common formats, `OptionalParam` for optional tool inputs, the tool errors (`UnknownValue`, `DatabaseUnavailable`, `DataUnavailable`) and `withDataErrors`, citation ID construction | TypeScript MCP servers that choose to use it; a server in another language follows the same conventions without it |
| `shared/node-config/` | Reading a node's configuration: `ConfigFileError`, YAML files decoded with a `Schema`, and `dotEnv(path)`, the `.env`-first configuration provider with `secret` and `port` for required variables | Every TypeScript node (the backend and each server), installed as a library; it is not a contract between nodes |

The code below is copied from the repo, where it typechecks against `effect` 4.1.2; the legal-text tool block is a draft until that server is built.

**Formats.** Months, dates and counts as tool inputs and results.

```ts
// shared/mcp-kit/src/Formats.ts
import { Schema } from "effect"

export { IsoDate } from "@policyhuis/protocol/Formats"

export const YearMonth = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "a month as YYYY-MM" }))
).annotate({ description: "A month, as YYYY-MM" })

export const PositiveInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)))
export const NonNegativeInt = Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0)))
```

**Optional parameters.** Models often send `null` for a parameter they leave unset, which a plain optional field rejects, so the call fails and the model retries. Every optional tool input is an `OptionalParam`: its published schema allows `null`, and `null` decodes as not given.

```ts
// shared/mcp-kit/src/Params.ts
import { Option, Schema, SchemaTransformation } from "effect"

/**
 * An optional tool parameter that also accepts `null`, which models often send for a parameter they leave unset.
 * The published input schema allows `null`, and `null` decodes as an absent key, so handlers see a value or nothing.
 */
export const OptionalParam = <S extends Schema.Top>(schema: S) =>
  Schema.optionalKey(Schema.NullOr(schema)).pipe(
    Schema.decodeTo(
      Schema.optionalKey(Schema.toType(schema)),
      SchemaTransformation.transformOptional({
        decode: (value) => Option.filter(value, (v): v is S["Type"] => v !== null),
        encode: (value) => value
      })
    )
  )
```

**Citations.** Every tool result carries the citations behind it in its `structuredContent` (see [Tool results](agent-loop.md#tool-results)). A citation is either a passage from a document (a law, a report or a reference) or a dataset query. Phase 1 uses dataset citations only; document citations arrive with the legal-text server in Phase 2. Every citation carries two stable IDs, assigned by the tool that returns it:

- **`sourceId`** names one version of a source: `<documentId>@<versionDate>` for a document (`rent_ordinance@2026-06-29`), `<datasetKey>@<sourceVersion>` for a dataset (`sf.development_pipeline@2026-08-28`). Every citation of the same dataset or PDF version, from any call, has the same `sourceId`.
- **`citationId`** names the part of that source a claim rests on: `<sourceId>#<provision>` for a document (`rent_ordinance@2026-06-29#37.9(a)(8)`), `<sourceId>#<queryKey>` for a dataset. `queryKey` is the first 16 hex characters of the SHA-256 of the tool name and its decoded parameters as canonical JSON (keys sorted, absent optional fields omitted), so the same query always gets the same ID.

Both IDs are derived from the citation's own fields, so they are the same across calls, requests, model configurations and evaluation runs. The schema rejects a citation whose IDs do not match its fields, so anything decoding citations (the browser app, the evaluation) can rely on the rule. The model cites claims with the full `citationId` (see [Citations in answers](agent-loop.md#citations-in-answers)).

**The archived file's hash is not in the citation.** Users can only open the publisher's live link (`sourceUrl`), not our archive, so the hash would cost the model tokens in every tool result without anything a user could check. It stays in `raw_sf.load_manifest`, where `sourceId` leads to the archived file and its hash for reproducing an answer or detecting that the publisher replaced a file. The browser app shows the version cited and notes that the live link may show newer data (see [Browser App Plan](browser-app.md#citations)). Serving archived public-domain files by `sourceId` can be added later without changing the citation.

The citation schema is in `protocol/`, because the browser app decodes it to show each source. `shared/mcp-kit` builds the IDs for TypeScript servers.

```ts
// protocol/src/Citation.ts
import { Schema } from "effect"

import { IsoDate } from "./Formats.ts"

const IdPart = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[A-Za-z0-9_.()-]+$/, { message: "letters, digits, _ . ( ) - only" }))
)

export const SourceId = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[A-Za-z0-9_.()-]+@[A-Za-z0-9_.()-]+$/, { message: "a source ID, <key>@<version>" })),
  Schema.brand("SourceId")
)

export const CitationId = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^[A-Za-z0-9_.()-]+@[A-Za-z0-9_.()-]+#[A-Za-z0-9_.()-]+$/, {
      message: "a citation ID, <sourceId>#<part>"
    })
  ),
  Schema.brand("CitationId")
)

const idsMatch = (sourceId: string, expectedSource: string, citationId: string, part: string) =>
  sourceId !== expectedSource
    ? `sourceId must be ${expectedSource}`
    : citationId !== `${sourceId}#${part}`
      ? `citationId must be ${sourceId}#${part}`
      : true

export class LegalCitation extends Schema.TaggedClass<LegalCitation>()(
  "LegalCitation",
  Schema.Struct({
    sourceId: SourceId,
    citationId: CitationId,
    documentId: IdPart,
    documentTitle: Schema.String,
    documentType: Schema.Literals(["law", "report", "reference"]),
    provision: IdPart,
    versionDate: IsoDate,
    quote: Schema.String,
    publisher: Schema.String,
    sourceUrl: Schema.String
  }).check(
    Schema.makeFilter((c) => idsMatch(c.sourceId, `${c.documentId}@${c.versionDate}`, c.citationId, c.provision))
  )
) {}

export class DatasetCitation extends Schema.TaggedClass<DatasetCitation>()(
  "DatasetCitation",
  Schema.Struct({
    sourceId: SourceId,
    citationId: CitationId,
    datasetKey: IdPart,
    title: Schema.String,
    publisher: Schema.NullOr(Schema.String),
    sourceUrl: Schema.String,
    sourceVersion: IdPart,
    tool: IdPart,
    parameters: Schema.Record(Schema.String, Schema.Unknown),
    queryKey: Schema.String.pipe(Schema.check(Schema.isPattern(/^[0-9a-f]{16}$/)))
  }).check(
    Schema.makeFilter((c) => idsMatch(c.sourceId, `${c.datasetKey}@${c.sourceVersion}`, c.citationId, c.queryKey))
  )
) {}

export const Citation = Schema.Union([LegalCitation, DatasetCitation])
export type Citation = typeof Citation.Type
```

| Field | Document | Dataset |
|---|---|---|
| Identity | `sourceId`, `citationId` | `sourceId`, `citationId`, `queryKey` |
| What was cited | `documentId`, `documentType`, `provision` (a section number for a law; a section number or `p<page>` for a report), `quote` | `datasetKey`, `title`, `tool` and `parameters`: the fixed tool that ran and the arguments it ran with, from which `queryKey` is computed |
| Which version | `versionDate`: the "amended through" or effective date | `sourceVersion`: the dataset's `rowsUpdatedAt` or the layer's edit date, as `YYYY-MM-DD` |
| Where it came from | `publisher`, `sourceUrl` (the copy loaded and quoted) | `publisher`, `sourceUrl`; the license is returned by `dataset_info` |

**Tool errors.** Returned to the model as results (`failureMode: "return"`), so it can correct its call or say there is no data. The backend does not interpret them. Three are shared through `shared/mcp-kit`; errors specific to one server's tools (such as `PeriodOutOfRange` for eviction counts) are defined with those tools.

- `UnknownValue` always lists the valid values.
- `DatabaseUnavailable`: the server could not connect or log in to its database (`ConnectionError` or `AuthenticationError` from `effect/sql`). The same call may succeed later.
- `DataUnavailable`: the database was reached, but the data the tool reads is not loaded (a dataset with no load, a zone with no row) or could not be read (any other query failure, or rows that do not decode). It names the datasets the tool reads.

A database failure is never a defect: `withDataErrors`, passed to each handler's `Effect.fn`, turns `SqlError` and `SchemaError` into one of the two, and logs the cause for whoever runs the server.

```ts
// shared/mcp-kit/src/ToolErrors.ts
import { Effect, Schema } from "effect"
import { SqlError } from "effect/sql"

export class UnknownValue extends Schema.TaggedError<UnknownValue>()("UnknownValue", {
  field: Schema.String,
  value: Schema.String,
  validValues: Schema.Array(Schema.String)
}) {}

/** The server could not connect or log in to its database; the same call may succeed later. */
export class DatabaseUnavailable extends Schema.TaggedError<DatabaseUnavailable>()("DatabaseUnavailable", {}) {}

/**
 * The database was reached, but the data a tool reads is not loaded or could not be read. `datasets` names the
 * datasets the tool reads; it is empty for a tool that reads the list of every dataset.
 */
export class DataUnavailable extends Schema.TaggedError<DataUnavailable>()("DataUnavailable", {
  datasets: Schema.Array(Schema.String)
}) {}

/** The errors every tool that reads a database can return to the model. */
export const DataErrors = [DatabaseUnavailable, DataUnavailable] as const

const UNREACHABLE_REASONS: ReadonlySet<string> = new Set(["ConnectionError", "AuthenticationError"])

/**
 * Turns a database failure into the tool error the model reads, logging the cause for whoever runs the server: a
 * failure to connect or log in is `DatabaseUnavailable`; any other query failure, or rows that do not decode, is
 * `DataUnavailable` for `datasets`.
 */
export const toDataError = (datasets: ReadonlyArray<string>) =>
  Effect.fnUntraced(function* (error: SqlError.SqlError | Schema.SchemaError) {
    if (error._tag === "SqlError" && UNREACHABLE_REASONS.has(error.reason._tag)) {
      yield* Effect.logWarning("The database could not be reached", error.reason)
      return yield* new DatabaseUnavailable()
    }
    yield* Effect.logError(`Data for ${datasets.join(", ") || "every dataset"} could not be read`, error)
    return yield* new DataUnavailable({ datasets })
  })

/**
 * Maps the database failures of a tool handler to `DatabaseUnavailable` and `DataUnavailable` for the datasets the
 * call reads, which `datasetsOf` derives from the handler's arguments. Pass it to `Effect.fn` after the handler body.
 */
export const withDataErrors =
  <Args extends ReadonlyArray<unknown>>(datasetsOf: (...args: Args) => ReadonlyArray<string>) =>
  <A, E, R>(
    self: Effect.Effect<A, E | SqlError.SqlError | Schema.SchemaError, R>,
    ...args: Args
  ): Effect.Effect<A, E | DatabaseUnavailable | DataUnavailable, R> =>
    Effect.catch(self, (error): Effect.Effect<never, E | DatabaseUnavailable | DataUnavailable> =>
      SqlError.isSqlError(error) || Schema.isSchemaError(error)
        ? toDataError(datasetsOf(...args))(error)
        : Effect.fail(error)
    )
```

## Data server tools

Fixed tools, each backed by a tested dbt model or query. Servers name tools without a prefix; the agent's directory file gives each server its prefix (`sf_`), and `McpClient.toolkit(client, prefix)` applies it, so the model sees `sf_development_pipeline_projects`. Phase 1 gives the model seven tools; Phase 2 adds two eviction tools and the legal-text server's two, for eleven, which spike S2 tests for tool selection.

| Tool (as the model sees it) | Phase | Answers | Errors |
|---|---|---|---|
| `sf_development_pipeline_projects` | 1 | Which projects are at a stage, since when, and with how many affordable units | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_development_pipeline_summary` | 1 | Totals by status, neighborhood, district or year of approval | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_affordable_pipeline_projects` | 1 | Which MOHCD projects, with units by income band and estimated dates | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_affordable_pipeline_summary` | 1 | Projects and affordable units by status, construction stage, neighborhood or district | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_affordable_pipeline_units_by_income_band` | 1 | Units in each income band, and how many projects have units in it | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_project_hazard_exposure` | 1 | Which projects from either pipeline sit inside one flood or exposure zone, and how many units they hold | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_dataset_info` | 1 | How current each dataset is, its license, and the publisher's own description of it | `UnknownValue`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_eviction_notice_counts` | 2 | How many notices, when, where, for which grounds; a period with no notices returns zero counts | `UnknownValue`, `PeriodOutOfRange`, `DatabaseUnavailable`, `DataUnavailable` |
| `sf_eviction_grounds` | 2 | Which grounds the data records, each with the reason and Rent Ordinance section the Rent Board's annual eviction report gives for it | `DatabaseUnavailable`, `DataUnavailable` |

**"Is it moving" is a filter, not a label.** `development_pipeline_projects` returns each project's status date and days in that status, counted to the snapshot's source version (the date its rows were published, which its citation carries) rather than to today, so the same query gives the same number for as long as the snapshot is current; it takes `inStatusSinceBefore` and `approvedBefore`, so a question such as "approved before 2020 and not yet under construction" is answered from the data. No tool decides what counts as stalled.

**One field, one meaning.** Units by income band have their own tool rather than a `groupBy` value of `affordable_pipeline_summary`: summing a project's affordable units into each band it has units in would count it several times, and band totals are a different quantity (`unitsInBand`) from project totals (`affordableUnits`).

**One snapshot per call.** A tool that reads the development pipeline reads the latest snapshot once, then filters every query behind its answer by that value, so the rows, the validation values and the `snapshot` it reports come from the same quarter even if dbt loads a new one meanwhile; dbt keeps every snapshot, so the value read first stays valid. A list tool's total and its rows come from one query (`count(*) OVER ()`), and each call reads the dataset list once for its citations.

**Inputs are validated against the data, not the schema.** Neighborhood names, districts, statuses and grounds are plain strings in the schema and are checked against the loaded reference tables, so new values in the source need no contract change. Field descriptions, not patterns, reach the model: Effect's tool JSON Schema carries each field's `description` but not its `isPattern` check, so formats such as `YYYY-MM` are stated in the description and enforced on decode.

**Limits of the data are stated three ways, none of them prose in config:**

- **Facts about the data are typed fields**, computed from the data: `snapshot`, `dataAsOf`, `statusSince` (null for the few projects without one), `projectsWithoutLocation`, a zone's `sourceEditedAt`, and dates named as estimates (`estimatedConstructionStart`).
- **The publisher's own caveats are loaded from the source.** Each loader archives the dataset's metadata, and `dataset_info` and `project_hazard_exposure` return the publisher's description verbatim, as a citable quote. DataSF's descriptions already state the main limits, for example the Eviction Notices dataset's "A notice of eviction does not necessarily indicate that the tenant was eventually evicted". Where a description is known to be stale (MOHCD's says "as of September 30, 2023"; the SFPUC zone layer's says July 1, 2022), the typed version fields are the authority, and the answer says the description is older than the data.
- **How to read a result is part of the tool's description**, in code, reviewed like code: for example, that counts by ground do not sum to the total, or that zones are never combined. The model reads these when it chooses the tool.

The answer rules (cite the snapshot, never say "stalled", notices are not evictions) are in these tool descriptions, not the backend's system prompt, which names no city (see [The system prompt](agent-loop.md#the-system-prompt)). The evaluation checks them. If the evaluation shows answers dropping a rule, the fix is a structured flag in the result (for example `countsOverlap: true`), not prose.

```ts
// san-francisco/housing-server/src/Tools.ts
import { Schema } from "effect"
import { Tool, Toolkit } from "effect/ai"

import {
  DataErrors,
  IsoDate,
  NonNegativeInt,
  OptionalParam,
  PositiveInt,
  UnknownValue,
  YearMonth
} from "@policyhuis/mcp-kit"
import { Citation } from "@policyhuis/protocol/Citation"

const Citations = Schema.Array(Citation)

/** What a tool returns to the model instead of a result: an input the data does not contain, or data it cannot read. */
const ToolFailure = Schema.Union([UnknownValue, ...DataErrors])

const NeighborhoodName = Schema.String.annotate({
  description: "An analysis neighborhood name, such as appears in tool results"
})
const SupervisorDistrict = PositiveInt.annotate({ description: "A supervisor district number" })
const DevelopmentStatus = Schema.String.annotate({
  description: "A Planning pipeline status, as listed by development_pipeline_summary grouped by status"
})
const AffordableStatus = Schema.String.annotate({
  description: "A MOHCD project status, as listed by affordable_pipeline_summary grouped by status"
})
const Limit = Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 50 })))

const DevelopmentProject = Schema.Struct({
  projectKey: Schema.String,
  blockLot: Schema.String,
  nameOrAddress: Schema.String,
  status: Schema.String,
  statusSince: Schema.NullOr(IsoDate),
  daysInStatus: Schema.NullOr(NonNegativeInt),
  planningApprovedOn: Schema.NullOr(IsoDate),
  netUnits: Schema.NullOr(Schema.Int),
  affordableUnits: Schema.NullOr(NonNegativeInt),
  affordableUnitsByLevel: Schema.Struct({
    extremelyLow: Schema.NullOr(NonNegativeInt),
    veryLow: Schema.NullOr(NonNegativeInt),
    low: Schema.NullOr(NonNegativeInt),
    moderate: Schema.NullOr(NonNegativeInt)
  }),
  neighborhood: Schema.NullOr(Schema.String),
  supervisorDistrict: Schema.NullOr(PositiveInt)
})

const AmiUnits = Schema.Struct({
  amiBand: Schema.String,
  units: NonNegativeInt
})

const AffordableProject = Schema.Struct({
  projectId: Schema.String,
  name: Schema.String,
  status: Schema.String,
  constructionStatus: Schema.String,
  neighborhood: Schema.String,
  supervisorDistrict: PositiveInt,
  totalUnits: NonNegativeInt,
  affordableUnits: NonNegativeInt,
  unitsByAmi: Schema.Array(AmiUnits),
  estimatedConstructionStart: Schema.NullOr(IsoDate),
  estimatedCompletion: Schema.NullOr(IsoDate)
})

export const HazardZoneKey = Schema.Literals([
  "slr_66in_100yr_storm",
  "sfpuc_100yr_storm",
  "air_pollutant_exposure_zone"
])
export const ProjectSource = Schema.Literals(["development_pipeline", "affordable_pipeline"])

export const DevelopmentPipelineProjects = Tool.make("development_pipeline_projects", {
  description:
    "List projects in the Planning Department's development pipeline, with each project's status, the date it reached that status, and its affordable units. The data is one quarterly snapshot: say which. Report how long a project has held its status; do not call a project stalled.",
  parameters: Schema.Struct({
    status: OptionalParam(DevelopmentStatus),
    neighborhood: OptionalParam(NeighborhoodName),
    supervisorDistrict: OptionalParam(SupervisorDistrict),
    minAffordableUnits: OptionalParam(NonNegativeInt),
    inStatusSinceBefore: OptionalParam(IsoDate),
    approvedBefore: OptionalParam(IsoDate),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    projects: Schema.Array(DevelopmentProject),
    snapshot: Schema.String,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const DevelopmentPipelineSummary = Tool.make("development_pipeline_summary", {
  description:
    "Total the development pipeline's projects, net units and affordable units by status, neighborhood, district or year of Planning approval, from one quarterly snapshot: say which.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["status", "neighborhood", "district", "approval_year"]),
    status: OptionalParam(DevelopmentStatus),
    affordableOnly: OptionalParam(Schema.Boolean)
  }),
  success: Schema.Struct({
    groups: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        projects: NonNegativeInt,
        netUnits: Schema.Int,
        affordableUnits: NonNegativeInt
      })
    ),
    snapshot: Schema.String,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const AffordablePipelineProjects = Tool.make("affordable_pipeline_projects", {
  description:
    "List MOHCD-supported affordable housing projects, with units by income band and construction dates. Construction start and completion dates are MOHCD's estimates and some have passed: say so when you use them.",
  parameters: Schema.Struct({
    status: OptionalParam(AffordableStatus),
    neighborhood: OptionalParam(NeighborhoodName),
    supervisorDistrict: OptionalParam(SupervisorDistrict),
    minUnits: OptionalParam(PositiveInt),
    estimatedStartBefore: OptionalParam(IsoDate),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    totalMatching: NonNegativeInt,
    projects: Schema.Array(AffordableProject),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const AffordablePipelineSummary = Tool.make("affordable_pipeline_summary", {
  description:
    "Total MOHCD's affordable pipeline projects and their affordable units by status, construction stage, neighborhood or district. For units by income band, use affordable_pipeline_units_by_income_band.",
  parameters: Schema.Struct({
    groupBy: Schema.Literals(["status", "construction_status", "neighborhood", "district"]),
    status: OptionalParam(AffordableStatus)
  }),
  success: Schema.Struct({
    groups: Schema.Array(
      Schema.Struct({ key: Schema.String, projects: NonNegativeInt, affordableUnits: NonNegativeInt })
    ),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const AffordablePipelineUnitsByIncomeBand = Tool.make("affordable_pipeline_units_by_income_band", {
  description:
    "Total MOHCD's affordable pipeline units in each income band, as a share of area median income (AMI), with how many projects have units in that band. Bands are named as MOHCD's dataset names its columns, such as _50_ami for 50% of AMI. A project with units in several bands is counted in each, so the project counts do not add up to the number of projects.",
  parameters: Schema.Struct({ status: OptionalParam(AffordableStatus) }),
  success: Schema.Struct({
    bands: Schema.Array(
      Schema.Struct({ amiBand: Schema.String, projects: NonNegativeInt, unitsInBand: NonNegativeInt })
    ),
    dataAsOf: IsoDate,
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const ProjectHazardExposure = Tool.make("project_hazard_exposure", {
  description:
    "List pipeline projects inside one flood or exposure zone. Each zone answers a different question (stormwater flooding, an extreme sea-level-rise scenario, or where new housing needs enhanced ventilation); never combine them into one risk. Name the zone, its publisher and date. Projects without a location are counted, not checked.",
  parameters: Schema.Struct({
    zone: HazardZoneKey,
    projects: ProjectSource,
    affordableOnly: OptionalParam(Schema.Boolean),
    limit: OptionalParam(Limit)
  }),
  success: Schema.Struct({
    zone: Schema.Struct({
      key: HazardZoneKey,
      name: Schema.String,
      publisher: Schema.NullOr(Schema.String),
      sourceEditedAt: IsoDate,
      publisherDescription: Schema.NullOr(Schema.String)
    }),
    projectsChecked: NonNegativeInt,
    projectsWithoutLocation: NonNegativeInt,
    totalInside: NonNegativeInt,
    unitsInside: Schema.Int,
    affordableUnitsInside: NonNegativeInt,
    projects: Schema.Array(
      Schema.Struct({ id: Schema.String, name: Schema.String, status: Schema.String, affordableUnits: NonNegativeInt })
    ),
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

export const DatasetInfo = Tool.make("dataset_info", {
  description:
    "Describe the loaded datasets: source, license, version, load date, and the publisher's own description, which states the data's limits in the publisher's words. Quote it when a user asks how current or reliable the data is.",
  parameters: Schema.Struct({ dataset: OptionalParam(Schema.String) }),
  success: Schema.Struct({
    datasets: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        title: Schema.String,
        publisher: Schema.NullOr(Schema.String),
        sourceUrl: Schema.String,
        license: Schema.NullOr(Schema.String),
        sourceVersion: Schema.String,
        publisherDescription: Schema.NullOr(Schema.String)
      })
    ),
    citations: Citations
  }),
  failure: ToolFailure,
  failureMode: "return"
})

/** A month range outside the months the Eviction Notices data covers. */
export class PeriodOutOfRange extends Schema.TaggedError<PeriodOutOfRange>()("PeriodOutOfRange", {
  requestedFrom: YearMonth,
  requestedTo: YearMonth,
  coveredFrom: YearMonth,
  coveredTo: YearMonth
}) {}

const GroundKey = Schema.String.annotate({ description: "A ground key, as listed by eviction_grounds" })
export const EvictionGroupBy = Schema.Literals(["ground", "neighborhood", "district", "year", "month"])

export const EvictionNoticeCounts = Tool.make("eviction_notice_counts", {
  description:
    "Count eviction notices filed with the San Francisco Rent Board in a range of months, optionally filtered to notices giving any of the listed grounds, a neighborhood or a supervisor district, and grouped by up to two of ground, neighborhood, district, year or month. A notice is a landlord's filing, not a completed eviction: say so. A notice can give several grounds, so counts by ground can add up to more than the total, and a notice that gives no ground is in the total but in no ground's count. Landlords need not file non-payment notices with the Rent Board, so those are undercounted.",
  parameters: Schema.Struct({
    from: YearMonth,
    to: YearMonth,
    grounds: OptionalParam(Schema.Array(GroundKey)),
    neighborhood: OptionalParam(NeighborhoodName),
    supervisorDistrict: OptionalParam(SupervisorDistrict),
    groupBy: OptionalParam(Schema.Array(EvictionGroupBy).pipe(Schema.check(Schema.isMaxLength(2))))
  }),
  success: Schema.Struct({
    from: YearMonth,
    to: YearMonth,
    dataAsOf: IsoDate,
    totalNotices: NonNegativeInt,
    groups: Schema.Array(Schema.Struct({ key: Schema.Record(Schema.String, Schema.String), notices: NonNegativeInt })),
    citations: Citations
  }),
  failure: Schema.Union([UnknownValue, PeriodOutOfRange, ...DataErrors]),
  failureMode: "return"
})

export const EvictionGrounds = Tool.make("eviction_grounds", {
  description:
    "List the grounds an eviction notice can give, as the Eviction Notices data names them, each with the reason and Rent Ordinance section that the Rent Board's annual report on eviction notices gives for it. Use the label and section as given; do not characterize the grounds.",
  success: Schema.Struct({
    grounds: Schema.Array(
      Schema.Struct({ key: Schema.String, label: Schema.String, section: Schema.NullOr(Schema.String) })
    ),
    citations: Citations
  }),
  failure: Schema.Union([...DataErrors]),
  failureMode: "return"
})

export const SfHousingToolkit = Toolkit.make(
  DevelopmentPipelineProjects,
  DevelopmentPipelineSummary,
  AffordablePipelineProjects,
  AffordablePipelineSummary,
  AffordablePipelineUnitsByIncomeBand,
  ProjectHazardExposure,
  DatasetInfo,
  EvictionNoticeCounts,
  EvictionGrounds
)
```

### Legal-text tools (Phase 2)

One codebase for every corpus; the San Francisco instance is prefixed `sf_` in the directory file. Each document is loaded in one version, so the tools take no date. Search is hybrid, as in the MVP plan: vector and keyword search over the same passages, combined by reciprocal rank fusion, which the Dutch corpus reuses.

```ts
// shared/legal-text/src/Tools.ts
export class ProvisionNotFound extends Schema.TaggedError<ProvisionNotFound>()("ProvisionNotFound", {
  documentId: Schema.String,
  provision: Schema.String
}) {}

const DocumentId = Schema.String.annotate({ description: "A document ID, such as appears in search results" })

const Passage = Schema.Struct({
  documentId: Schema.String,
  provision: Schema.String,
  heading: Schema.NullOr(Schema.String),
  text: Schema.String,
  versionDate: IsoDate
})

export const SearchPolicy = Tool.make("search_policy", {
  description: "Search the loaded laws and policies for passages relevant to a question.",
  parameters: Schema.Struct({
    query: Schema.String.pipe(Schema.check(Schema.isMinLength(1), Schema.isMaxLength(500))),
    documentId: OptionalParam(DocumentId),
    limit: OptionalParam(Schema.Int.pipe(Schema.check(Schema.isBetween({ minimum: 1, maximum: 10 }))))
  }),
  success: Schema.Struct({ passages: Schema.Array(Passage), citations: Citations }),
  failure: Schema.Union([UnknownValue, ...DataErrors]),
  failureMode: "return"
})

export const GetProvision = Tool.make("get_provision", {
  description: "Return the full text of one section or subsection.",
  parameters: Schema.Struct({
    documentId: DocumentId,
    provision: Schema.String.annotate({ description: "A section or subsection number, such as appears in search results" })
  }),
  success: Schema.Struct({ passages: Schema.Array(Passage), citations: Citations }),
  failure: Schema.Union([UnknownValue, ProvisionNotFound, ...DataErrors]),
  failureMode: "return"
})

export const LegalTextToolkit = Toolkit.make(SearchPolicy, GetProvision)
```

## Database schemas

Three Neon projects (see [Data servers](#data-servers)), each with its own schemas; `sf-legal-text` is created in Phase 2. Column names in `raw_sf` are the source's own field names, read from each dataset's DataSF metadata (`https://data.sf.gov/api/views/<id>.json`) on November 4, 2026.

| Neon project | Schema | Written by | Migrations | Read by |
|---|---|---|---|---|
| `sf-housing` | `raw_sf` | Python loaders | Alembic (raw SQL) | dbt |
| `sf-housing` | `sf` | dbt | dbt | `sf-housing` server (role `sf_housing_reader`) |
| `sf-legal-text` (Phase 2) | `raw_sf` | Python loaders | Alembic | Passage pipeline |
| `sf-legal-text` (Phase 2) | `policy_text_sf` | Python passage pipeline | Alembic | Legal-text server (role `sf_legal_text_reader`) |
| `app` | `app` | Backend | Drizzle (`backend/drizzle/`) | Backend, evaluation reports; see [The `app` schema](agent-loop.md#the-app-schema) |

Each reader role has `USAGE` on its schema and `SELECT` on its tables, and nothing else.

### `raw_sf` (both data projects)

Every load writes one manifest row and its data rows in one transaction.

```sql
CREATE TABLE raw_sf.load_manifest (
    load_id               uuid PRIMARY KEY,
    source_key            text NOT NULL,          -- key in san-francisco/ingest/config/sources.yaml, and the raw table's name
    source_url            text NOT NULL,          -- the publisher's page, cited as sourceUrl
    data_url              text NOT NULL,          -- the request that fetched the data
    source_version        date NOT NULL,          -- rowsUpdatedAt or the layer's edit date, in UTC
    archive_key           text NOT NULL,          -- object storage path of the archived data
    archive_sha256        char(64) NOT NULL,
    metadata_archive_key  text NOT NULL,          -- object storage path of the archived metadata
    license               text,                   -- as stated by the source; null when none is stated
    source_title          text NOT NULL,          -- from the archived metadata
    publisher             text,                   -- the metadata's attribution
    publisher_description text,                   -- the metadata's description, verbatim
    row_count             integer NOT NULL,
    loader_version        text NOT NULL,          -- git commit of the loader, "-dirty" with uncommitted changes
    loaded_at             timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_key, archive_sha256)
);
```

Each raw table has the same four columns: `load_id`, `row_number`, `record` (the source row as `jsonb`, keyed by the source's own field names) and `geom` (the parsed geometry for GeoJSON sources, in EPSG:4326). Keeping the whole row as `jsonb` means no source column is dropped or retyped at load, and dbt reads fields with `record ->> 'field'`. A load whose data hash matches an earlier load of the same source is skipped. The loaders are in [`san-francisco/ingest/`](../../san-francisco/ingest/README.md).

| Table | Phase | Source | Fields used downstream |
|---|---|---|---|
| `raw_sf.development_pipeline` | 1 | `6jgi-cpb4` | `blklot`, `case_no`, `nameaddr`, `current_status`, `current_status_date`, `approved_date_planning`, `net_pipeline_units`, `pipeline_affordable_units`, `bmr_units_ex_low`, `bmr_units_very_low`, `bmr_units_low`, `bmr_units_moderate`, `nhood41`, `sd22`, `latitude`, `longitude`; the snapshot quarter, read from the metadata's description ("as of the end of 2026 Q2") |
| `raw_sf.affordable_pipeline` | 1 | `aaxw-2cb8` | `project_id`, `project_name`, `project_status`, `construction_status`, `housing_tenure`, `city_analysis_neighborhood`, `supervisor_district` (text in the source), `total_project_units`, `mohcd_affordable_units`, the AMI columns (`_20_ami` … `_150_ami`, `ami_undeclared`), `estimated_actual_construction_start_date`, `estimated_construction_completion`, `planning_case_number`, `block`, `lot`, `latitude`, `longitude` |
| `raw_sf.analysis_neighborhoods` | 1 | `j2bu-swwd` | `nhood` |
| `raw_sf.slr_66in_100yr_storm` | 1 | `6ann-usi8` | geometry → `geom` |
| `raw_sf.sfpuc_100yr_storm` | 1 | SFPUC FeatureServer layer 2 | `objectid`, `acres`, geometry → `geom` |
| `raw_sf.air_pollutant_exposure_zone` | 1 | `t65d-x6p8` | geometry → `geom` |
| `raw_sf.eviction_notices` | 2 | `5cei-gny5` | `eviction_id`, `file_date`, the 19 ground flags (`non_payment` … `good_samaritan_ends`, the dataset's true-or-false fields), `neighborhood`, `supervisor_district`, `shape` |
| `raw_sf.eviction_report` | 2 | The annual eviction report PDF | One row per page: `page`, `text` |
| `raw_sf.document_pages` (`sf-legal-text`) | 2 | Each ordinance, report and the Rent Ordinance PDF | `document_key`, `page_number`, `text` |
| `raw_sf.ca_code_sections` (`sf-legal-text`) | 2 | Legislature bulk download | The section's code, number, heading, text and the bulk file's own version fields, named as in the bulk file |

### `sf` (dbt models)

| Model | Phase | Grain | Columns | Tests |
|---|---|---|---|---|
| `neighborhoods` | 1 | One per analysis neighborhood | `name` (PK) | Unique, not null |
| `development_pipeline` | 1 | One per project in the snapshot | `project_key` (PK with `snapshot`: parcel, Planning case and permit application), `block_lot`, `name_or_address`, `status`, `status_since`, `planning_approved_on`, `net_units`, `affordable_units`, `units_extremely_low` … `units_moderate`, `neighborhood` (FK, nullable, names converted to the official spelling), `supervisor_district` (int, cast from text), `geom geometry(Point, 4326)` (nullable), `snapshot`, `source_version` (the snapshot load's source version, from the manifest), `load_id` | Unique per snapshot; status values are the six documented ones after mapping `BP BP Issued`; no project's `status_since` is later than its `source_version`, since days in a status are counted to it; a warning test lists projects whose affordable units by level do not sum to `affordable_units` (18 on November 4, 2026) |
| `affordable_pipeline` | 1 | One per project | `project_id` (PK), `name`, `status`, `construction_status`, `neighborhood` (FK), `supervisor_district` (int, cast from text), `total_units`, `affordable_units`, `estimated_start`, `estimated_completion`, `geom geometry(Point, 4326)`, `load_id` | Unique; every project has a location, or the build fails |
| `affordable_pipeline_ami_units` | 1 | One per project and income band | `project_id`, `ami_band` (the source column name), `units` | Bands are an unpivot of the source's AMI columns; zero-unit rows are dropped |
| `zones` | 1 | One per flood or exposure zone | `zone` (PK: `slr_66in_100yr_storm`, `sfpuc_100yr_storm`, `air_pollutant_exposure_zone`), `name`, `publisher`, `source_edited_at`, `publisher_description`, `geom` (polygons repaired with `ST_MakeValid`, then merged), `load_id` | Name, publisher, edit date and description come from each source's archived metadata; the zone key is the source's key in `san-francisco/ingest/config/sources.yaml` |
| `project_zone_exposure` | 1 | One per project, source and zone it falls inside | `project_source` (`development_pipeline` or `affordable_pipeline`), `project_id`, `zone` | `ST_Intersects`, for the latest pipeline snapshot; tests pin synthetic projects inside and outside a zone |
| `datasets` | 1 | One per loaded dataset | `dataset_key`, `title`, `publisher`, `source_url`, `license`, `source_version`, `publisher_description` | Built from the latest manifest row per source and its archived metadata |
| `eviction_report_grounds` | 2 | One per reason in the latest report's table | `reason`, `section` (null for "other or no reason given"), `page`, `load_id` | Reasons unique; a warning lists reasons no ground column records |
| `eviction_grounds` | 2 | One per ground flag in the latest Eviction Notices load | `ground_key` (the source column name), `label` (the report's reason), `section` (nullable), `report_load_id` | Unique; every ground has a reason found in the report |
| `eviction_notices` | 2 | One per notice | `eviction_id` (PK), `file_date`, `file_month`, `neighborhood` (FK → `neighborhoods`, nullable), `supervisor_district` (int, nullable), `geom` (nullable), `load_id` | Unique; neighborhoods not in `neighborhoods` fail the build |
| `eviction_notice_grounds` | 2 | One per notice and ground it gives | `eviction_id` (FK), `ground_key` (FK) | A notice with no ground flag is kept in `eviction_notices` and listed by a warning, not dropped silently (331 on November 6, 2026) |

**Snapshots are kept.** `development_pipeline` keeps every loaded quarter, keyed by `snapshot`, so later loads can show movement between quarters. Phase 1 loads the current public quarter; past quarters are being requested from the dataset owner (open question 3).

`eviction_notice_counts` aggregates `eviction_notices` and `eviction_notice_grounds` at query time with fixed, parameterized SQL; the dataset is small enough that it needs no pre-aggregated models.

### `policy_text_sf` (Phase 2)

```sql
CREATE TABLE policy_text_sf.documents (
    document_id     text PRIMARY KEY,       -- key in san-francisco/legal-text/corpus.yaml
    title           text NOT NULL,
    document_type   text NOT NULL CHECK (document_type IN ('law', 'report', 'reference')),
    publisher       text NOT NULL,
    version_date    date NOT NULL,          -- "amended through", "amended in Board" or report date, from the source
    source_url      text NOT NULL,
    load_id         uuid NOT NULL,          -- raw_sf.load_manifest in the same project
    archive_sha256  char(64) NOT NULL
);

CREATE TABLE policy_text_sf.passages (
    passage_id        uuid PRIMARY KEY,
    document_id       text NOT NULL REFERENCES policy_text_sf.documents,
    provision         text NOT NULL,        -- such as 37.9(a)(8)
    parent_provision  text,
    heading           text,
    ordinal           integer NOT NULL,     -- order within the document
    text              text NOT NULL,
    tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
    UNIQUE (document_id, provision)
);

CREATE INDEX passages_tsv ON policy_text_sf.passages USING gin (tsv);
```

**Embeddings come in a later migration.** A `halfvec` column needs a fixed dimension, which depends on the embedding model spike S4 chooses. That migration adds `embedding halfvec(<dimension>)`, `embedding_model text NOT NULL`, and an HNSW index with `halfvec_cosine_ops`. The server checks at startup that its configured embedding model matches the stored one.

## Ingestion for San Francisco

Python, in [`san-francisco/ingest/`](../../san-francisco/ingest/README.md), built on the shared library in [`shared/ingest/`](../../shared/ingest/README.md) and following the provenance rules in [CLAUDE.md](../../CLAUDE.md):

| Loader | Phase | Archive | Raw tables | Notes |
|---|---|---|---|---|
| DataSF datasets | 1 (pipelines, zones, neighborhoods); 2 (evictions) | Each full export (CSV or GeoJSON) and the dataset's metadata (`/api/views/<id>.json`) | One `raw_sf` table per dataset; the metadata's name, attribution and description in `raw_sf.load_manifest` | Source version is the dataset's `rowsUpdatedAt` |
| SFPUC flood map | 1 | GeoJSON export of the 2024 update's zone layer (layer 2) and the layer's JSON metadata | `raw_sf.sfpuc_100yr_storm` | Source version is the layer's edit date |
| PDF documents (`kind: pdf` in `sources.yaml`) | 2 (the annual eviction report) | Each PDF, and a metadata file holding the PDF's own information record and the printed date matched | `raw_sf.<source key>`, one row per page of text extracted by pypdf | Title and publisher are declared as printed in the document, since PDFs rarely carry them. Source version is the date printed in the document: `version_pattern` must match it exactly once or the load fails. The legal-text corpus's loader (`raw_sf.document_pages`, P2.1) is to reuse this source type. |
| California statutes | 2 | The bulk database file | `raw_sf.ca_code_sections` | Only sections listed in the corpus file are loaded; source version is the bulk file's date |

The dbt models are listed in [Database schemas](#sf-dbt-models).

The passage pipeline (Phase 2) splits each law at its section headings and then at subsections ("Sec. 37.x" for Chapter 37; "SEC." headings in the ordinances), the California sections at section and subdivision, and reports at their headings, falling back to pages. Each passage keeps its provision or heading, version and source. The San Francisco corpus is English, so no translation step runs.

## How this extends to the Netherlands

The San Francisco build sets patterns that the Dutch product reuses unchanged:

- **Stable source and citation IDs**, built from each citation's own fields, work unchanged for Dutch sources.
- **Added when the Netherlands needs them:** a jurisdiction on citations and tool inputs (for a server covering several municipalities), and a language and machine-translation label on document citations. Both are additive.
- **One legal-text codebase.** The Dutch corpus is another instance, with the translation step added to its passage pipeline.
- **Data servers by source, with the place as a parameter**, rather than one server per city, once more than one place shares a source.
- **The agent loop and API are place-independent.** Adding the Netherlands adds servers to the directory file.

## Browser app

The browser app is the same for every city; its plan, including how tool calls and citations are shown, is the [Browser App Plan](browser-app.md).

## Milestones

| Phase | Milestone | Done when |
|---|---|---|
| 1 | P1.1 Contracts | `protocol/` and the `shared/mcp-kit` helpers in [Protocol and shared helpers](#protocol-and-shared-helpers), the Phase 1 tools in [Data server tools](#data-server-tools) and [API contract](agent-loop.md#api-contract) in code, with decode tests; migrations for `raw_sf` and `app` written. |
| 1 | P1.2 Data loaded | Both pipelines, the three zones and neighborhoods loaded with provenance; dbt models and tests pass; database size measured. |
| 1 | P1.3 `sf-housing` server | The seven Phase 1 tools pass tests through `McpTest` against a Postgres testcontainer. |
| 1 | P1.4 First cited answer | The agent loop answers a "where is it, and is it moving" question and a climate-ready question through `POST /api/v1/questions`, with dataset citations and a trace in `app`. |
| 1 | P1.5 Prototype | The browser app shows streamed answers, collapsible tool calls and linked citations against the running backend, as in the [Browser App Plan](browser-app.md). |
| 2 | P2.1 Documents | The ordinances, reports and data dictionary loaded into `sf-legal-text`; the legal-text server answers with document citations labeled by type. |
| 2 | P2.2 Rent Ordinance and statutes | Chapter 37 and the California sections loaded. |
| 2 | P2.3 Evictions | Eviction Notices and the annual eviction report loaded, with each ground's section taken from the report; the two eviction tools pass tests; a rule-plus-data eviction question is answered end to end. |
| 3 | P3.1 Evaluation | The San Francisco questions run against the three model configurations, with answers checked by the San Francisco reviewer. |

## Next steps

- **Cache reference data in `sf-housing`.** Each tool call reads the dataset list, the latest snapshot and the values it validates inputs against (statuses, neighborhoods, districts) before its main query, each a round trip to Neon. These change only when a load runs, so the server could cache them per process, refreshed on a short interval or when a dataset's `source_version` changes, leaving one query per call. Counts and lists already come from one query (`count(*) OVER ()`).

## Open questions

1. **Who checks San Francisco answers?** The research team is focused on the Netherlands. A reviewer with San Francisco housing knowledge is needed for the evaluation set, ideally from a policy office or a tenant organization.
2. **Data server split.** This plan recommends one `sf-housing` server for now; confirm, or split housing and climate from the start.
3. **Past pipeline quarters.** Planning retired its earlier quarterly snapshots from DataSF as of 2024 Q3; the dataset's description says to ask the dataset owner for them. A request is in progress; until data arrives, the plan uses the current public quarter.
4. **Enacted inclusionary text.** Confirm the enacted ordinance number and final text for Board File 260538 before loading it.
5. **Rent Board Housing Inventory.** Add it after Phase 2, for "is my unit covered" and rent-band questions?

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
