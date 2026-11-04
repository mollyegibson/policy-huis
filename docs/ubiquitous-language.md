# Ubiquitous Language

The agreed vocabulary for PolicyHuis. If a term is here, code and docs spell it this way. If the code needs a term that isn't here, add a row in the same PR.

The terms come from the [MVP Technical Plan](./plans/mvp-technical-plan.md) and the [Provisional Questions](./plans/provisional-questions.md). Housing-law terms specific to one city (for example *huurtoeslag* or *just cause*) are added as the sources are loaded, with the source that defines them.

## Questions and answers

| Term | Meaning |
|---|---|
| **Question** | One request from a user, answered on its own. Requests are stateless: there is no conversation memory. |
| **Answer** | The agent's reply to a question, in English and plain language, streamed to the caller with its citations. |
| **Claim** | One statement in an answer. Every claim has at least one citation. |
| **Citation** | The object behind a claim: source, title, provision or table, version or effective date, source URL, archived file hash and language. Defined once in the shared contract and produced only by tools. |
| **Decline** | An answer that does not give what was asked, says why, and points to the right body (the San Francisco Rent Board or the Huurcommissie) or to the missing data. Used for legal advice, causal conclusions and questions the data can't answer. |
| **Question type** | One of Rule (legal-text server only), Ground (data server only), Rule + data (both), Climate, Cross-city (both cities' servers) and Decline. |
| **Rule-plus-data pair** | A provision and a dataset that answer questions about it together, e.g. Chapter 37 of the SF Administrative Code with the Eviction Notices dataset. Each city's first pair is loaded in full before other sources. |

## Agent and servers

| Term | Meaning |
|---|---|
| **Agent** | The one reasoning loop that answers a question: it calls the model, calls tools and assembles the answer. There is one agent, not one per city. |
| **Agent service** | The TypeScript service that is both the backend API and the agent loop. |
| **MCP server** | An independent server exposing tools over the Model Context Protocol. A server's specialization is its data and tools, not its model. |
| **Legal-text server** | The MCP server for laws, ordinances and policy documents. One codebase, run once per corpus. |
| **Data server** | The MCP server for one city's housing, demographic and climate data (`sf-data`, `ams-data`). |
| **Tool** | One operation an MCP server exposes, with an input and output schema. |
| **Tool prefix** | The server's prefix on every tool name (e.g. `sf_`, `ams_data_`), so the model can tell same-purpose tools apart across cities. |
| **Tool error** | A typed failure returned as a tool's result (e.g. no data for that period), not a transport failure. |
| **Directory file** | The file in the repo listing each server's name, address, owner and tool prefix. The agent connects to every server it lists. |
| **Model configuration** | Which model provides `LanguageModel` for a run: Local (the open-weight model on the agent host), Same model in the cloud (the same open-weight model at a cloud provider) or Frontier (a closed cloud model, as the accuracy ceiling). |
| **Agent host** | The machine running the agent service and the local model runtime. |
| **Trace** | The record of one request in the `app` schema: model configuration, tool calls, token counts, latency and energy sample. |

## Legal text and retrieval

| Term | Meaning |
|---|---|
| **Corpus** | The set of documents one legal-text server instance searches: one per city. Corpus membership is declared in `config/`. |
| **Document** | One law, ordinance or policy document in a corpus, e.g. the Huisvestingsverordening Amsterdam 2024. |
| **Version** | One edition of a document, with its effective date. A citation names the version a rule applies to. |
| **Effective date** | The date a version takes legal effect. Not the publication or fetch date. |
| **Provision** | An addressable unit of a document as the document itself numbers it: an article, section or paragraph (e.g. Section 37.9, artikel 7:248). |
| **Passage** | The unit of retrieval: a span of a document split along its own structure, with its version and effective date. Stored with its text, embedding and, for Dutch sources, its translation. |
| **Original text** | A passage's text in its source language (`text_nl` for Amsterdam). Citations quote it. |
| **Machine translation** | The stored English translation of a Dutch passage (`text_en`), with the translation model's identifier. Always labeled as machine translation when shown. |
| **Hybrid search** | Vector search and keyword search run over the same passages, with their rankings combined by RRF. |
| **RRF** | Reciprocal rank fusion: each passage scores the sum of `1 / (k + rank)` over the searches that found it, with `k = 60`. Ties are broken by vector distance. |
| **Identifier search** | An optional keyword search over the Dutch original with the `simple` configuration, for exact identifiers. Kept only if spike S3 shows it adds value. |
| **Embedding model** | The one model both the passage pipeline and the legal-text server use to embed text. Its identifier is stored with every embedding. |

## Data platform

| Term | Meaning |
|---|---|
| **Source** | A published dataset or document we load, with its access method and license recorded in the city's source proposal. |
| **Source proposal** | The per-city record of each chosen source, why it was chosen, its access method, license or reuse terms, and its actual format. |
| **Load** | One fetch of one source file into a `raw_*` schema, recorded as a manifest row in the same transaction as its data rows. |
| **Manifest** | The table of loads: what was fetched, when, from where, with which filters, and the archived file's hash. |
| **Archive** | The object storage holding every downloaded source file, unchanged. The archived file's SHA-256 identifies the exact bytes. |
| **Source version** | Which edition of a source a load came from, as the source exposes it (a release label, last-edited date or fetch time). |
| **Filter** | Rows dropped as a load is parsed, such as a nationwide dataset filtered to one city. Set in `config/sources.yaml` and recorded in the manifest. |
| **raw_* / sf, ams / policy_text_* / app** | The database schemas: data as fetched per city; dbt models each data server reads; passages each legal-text server reads; agent traces and evaluation results. |

## Evaluation and energy

| Term | Meaning |
|---|---|
| **Question set** | The reviewed file of evaluation questions, with expected answers and citations checked by the research team's policy expert. |
| **Evaluation run** | One pass of the question set against one model configuration, with results written to `app`. |
| **Measured energy** | Energy for a local request, sampled with `powermetrics` net of an idle baseline taken the same way. |
| **Estimated energy** | Energy for a cloud request, estimated with EcoLogits from token counts and latency. Always shown with its uncertainty and never presented as measured. |
| **One-time cost** | Energy spent at load time (translation, embedding), reported separately from per-query energy. |
| **Spike** | A short experiment that answers one question before build-out, recorded in `docs/plans/spikes/` with its decision. |
