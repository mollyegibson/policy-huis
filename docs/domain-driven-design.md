# Domain-Driven Design and Hexagonal Architecture

- **Status:** working agreement for PolicyHuis
- **Companions:** [Working Agreement](./working-agreement.md) (the rules in citable form), [Ubiquitous Language](./ubiquitous-language.md) (the vocabulary), [MVP Technical Plan](./plans/mvp-technical-plan.md) (the components these rules apply to)

Where each kind of code belongs, and why the boundaries are drawn where they are. We borrow from domain-driven design selectively: hexagonal architecture plus the few DDD ideas that pay for themselves at our size. DDD is a toolkit, not a checklist.

---

## The shape

```mermaid
graph LR
  subgraph Driving["Outside · callers"]
    WEB(["Web app<br/>(via the backend API)"])
    EVAL(["Evaluation runs"])
    CLI(["Pipeline commands"])
  end

  subgraph Core["Domain"]
    LOOP["Agent loop<br/>behavior rules · citation assembly"]
    TOOLS["Server tools<br/>search · provisions · city data queries"]
    LOAD["Load rules<br/>manifest · filters · passages · translation"]
  end

  subgraph Driven["Driven adapters"]
    MODEL["Model layer<br/>LanguageModel · EmbeddingModel"]
    MCP["MCP client"]
    REPO["Repos<br/>Postgres access"]
    SRC["Source loaders<br/>DataSF · BWB · CBS · …"]
    ARC["Archive<br/>object storage"]
  end

  subgraph Systems["Outside · systems"]
    RT(["Model providers<br/>OpenRouter · Anthropic · a local runtime"])
    PG[("Postgres<br/>one schema per server")]
    S3[("Object storage")]
    UP(["Public sources"])
  end

  WEB --> LOOP
  EVAL --> LOOP
  CLI --> LOAD
  LOOP --> MODEL
  LOOP --> MCP
  MCP --> TOOLS
  TOOLS --> REPO
  LOAD --> SRC
  LOAD --> ARC
  LOAD --> REPO
  MODEL --> RT
  REPO --> PG
  ARC --> S3
  SRC --> UP
```

Read it left to right: **outside → adapter → domain → adapter → outside.** Every arrow points into the domain from callers and out of it toward infrastructure, never back. The agent loop knows nothing about HTTP or server-sent events on its left, or about which model runtime answers on its right. That one-way property is the architecture.

The MCP client is the one place the picture folds: to the agent, an MCP server is a driven adapter; to the MCP server, the agent is a driving caller. Each server is its own hexagon, with its tool handlers as the domain and its repo as the driven adapter.

The acceptance test comes from Alistair Cockburn's [Ports and Adapters](https://alistair.cockburn.us/hexagonal-architecture/): the application should be equally drivable by a user, a test, or a script, and equally able to run against real infrastructure or a stub. For us that means:

- **The agent loop runs against a stub model and stub tools** in a test, with no runtime, network or database.
- **Every model configuration (the open-weight model in the cloud, the frontier model, a local model) is one layer swap.** The loop, prompts and tools don't change; only the layer that provides `LanguageModel` does.
- **An MCP server's tool handlers run against a test database** without the agent, so each tool's numbers are tested on their own.
- **Loaders are testable with an in-memory archive and recorded HTTP responses.**

If a piece of logic can only be reached through a request handler, a live model or a live database, the boundary isn't real.

---

## Quick reference

| Term | Means |
|---|---|
| **Port** | A contract: what can be asked, with no commitment to how it's answered |
| **Adapter** | An implementation of a port against one specific technology |
| **Driving** | The outside calls in (the backend API, an evaluation run, a pipeline command, an MCP request) |
| **Driven** | We call out (a model runtime, an MCP server, Postgres, object storage, a public source) |

**Where does this code go?**

1. Does it translate an HTTP request, an evaluation run, a CLI command or an MCP request into a domain call? → **driving adapter** (the `HttpApi` handlers, the MCP tool registration, the pipeline CLI). No business rules.
2. Is it a rule about answers, citations, retrieval or the data (cite every claim, RRF ranking, load filters, passage splitting)? → **domain**.
3. Does it talk to a model, an MCP server, a database, a bucket or an external source? → **driven adapter** (the model layer, the MCP client, repos, the archive, source loaders).
4. None of the above and no substitution needed? → a plain function. Don't add a layer.

---

## Bounded contexts

A bounded context is a boundary within which a term means exactly one thing. The code is organized by deployable unit, then by domain: each city has ingestion projects, which run as scheduled jobs that write their schemas, and MCP servers, which run as long-lived services that only read them. They are never deployed together: ingestion holds write credentials and a server holds a read-only role. Ours, and the contract each publishes:

| Context | Language | Writes | Reads | Published contract |
|---|---|---|---|---|
| **Data ingestion** (`san-francisco/ingest/data/`, and the Dutch one) | Python, dbt | `raw_sf_data`, `sf_data` | Public sources | The `sf_data` schema |
| **Documents ingestion** (`san-francisco/ingest/documents/`, and the Dutch one) | Python | `raw_sf_docs`, `sf_docs` | Public sources, the embedding model | The `sf_docs` schema |
| **Data servers** (`san-francisco/mcp-servers/data/`, and the Dutch one) | TypeScript, Effect | Nothing | Its city's data schema (`sf_data`) | Its MCP tools |
| **Docs servers** (`san-francisco/mcp-servers/documents/`, and the Dutch one) | TypeScript, Effect | Nothing | Its city's documents schema (`sf_docs`) | Its MCP tools |
| **Backend** (`backend/`) | TypeScript, Effect | `app` | MCP tools only | The backend API |
| **Evaluation** (`evaluation/`) | TypeScript, YAML | Its own run results (`evaluation/results/`) | The backend API | The question-set file format |

A server and the ingestion project that builds its schema share a short name (`sf_data`, `sf_docs`) in every identifier: server, tool prefix, citation namespace, schemas, reader role, environment variables and packages. Directories use the full words (`ingest/documents/`, since `ingest/docs/` would read as a documentation folder), and so do the labels users see ("SF Data", "SF Documents"). The Dutch nodes are `nl-data` and `nl-docs`.

**Contexts communicate through published contracts, never by importing each other's code.** The agent doesn't read `sf_docs`; it calls the docs server's tools. A data server doesn't read another city's schema. Python and TypeScript share only database schemas. A change to a published contract (a schema another context reads, an MCP tool's input or output, the backend API) is a contract change and gets reviewed as one.

**Shared code is plumbing, never a contract.** A library under `shared/` does work several nodes need done the same way: reading configuration (`shared/node-config`), fetching, archiving and loading sources (`shared/ingest`). It never defines what one context publishes to another. Tool errors, citation shapes and tool results are conventions, written down below, that each node implements in its own code and tests against; a server built in another language follows them with nothing to install. Duplicating a few small helpers across independently deployed servers is the price, and it is accepted.

MCP servers share nothing with the backend but MCP itself (their tool definitions, `outputSchema` and `structuredContent`) and these conventions. `protocol/` holds the API between the backend and the browser app, including the citation schema the browser decodes, as Effect `Schema`; only those two import it, and it holds no logic and no database access.

### Conventions between servers and the backend

**Citations.** Every tool's `structuredContent` has a top-level `citations` array, declared in the tool's `outputSchema`. Each citation has:

| Field | Meaning |
|---|---|
| `citationId` | `<sourceId>#<part>`, where `<part>` is letters, digits and `_ . ( ) -`; how a server builds the part is its own choice |
| `sourceId` | `<namespace>.<key>@<version>`, where the namespace is the server's short name (`sf_data`, `sf_docs`), so IDs stay unique without coordination |
| `title`, `publisher`, `sourceUrl`, `version` | The source, as shown to the user |
| `locator` | Optional. Which part of the source, in words: a provision ("Sec. 37.9(a)(8)") or the data selected ("Planning pipeline projects, with status BP Filed"). Built only from the source's fields and the tool's arguments, so the same query always gets the same locator |
| `quote` | Optional. The cited text, verbatim |

A server may add fields of its own (the docs server adds `documentType` for the model); the backend ignores them. Each server's tests decode every citation its tools return against the convention. The tool's name and arguments behind a citation are not part of it: they stay in the trace and in the lookup the browser shows.

**Tool titles.** Each tool carries a `Tool.Title` annotation, which `McpServer` publishes as the MCP tool's `annotations.title`; the backend shows it as the lookup's title.

**Tool errors.** Errors are returned as tool results (`failureMode: "return"`), with the error's `_tag` in the JSON text content. One tag has a meaning outside its server: `DatabaseUnavailable`, for a server that cannot reach its own database. The backend treats it, like a transport failure, as the server being unavailable.

Isolation extends to credentials: each MCP server connects with a database role that can only read its own schema, so the grants enforce the boundary rather than convention alone. No server reads another server's schema, so moving a server to its own database is a connection-string change.

---

## Patterns worth naming

### Anti-corruption layer

An anti-corruption layer stops another system's model from leaking into ours. We have three kinds:

- **Source loaders.** Each loader maps a source's columns, by name, into typed rows and fails the load on a value it can't parse. DataSF can add a column or the BWB can change its XML; the blast radius is one parser.
- **Model output.** Tool-call arguments from the model are decoded through the tool's input schema before a handler runs. A small model can produce malformed arguments; they fail at the boundary and go back to the model as a typed error.
- **Tool results.** The model receives each result as the server sent it, except that each citation ID is replaced by a short key (`C1`, `C2`, …) that the backend expands back to the full ID in the answer it streams; the trace keeps results as the servers sent them. The backend reads each result's citations through its own schema of the citation convention, drops any that break it (logging them), and sends the rest to the browser app as `Sources`; the browser decodes them through `protocol/`'s schema and never reads citations from a result itself.

**Rule:** every upstream response is decoded through a parser or schema we own. Raw JSON never crosses into domain code. In Python that's typed parsing (pydantic, explicit conversion); in TypeScript it's Effect `Schema`.

### Numbers come from data, not from the model

Every number in an answer comes from a tool result, and every tool result comes from a tested query over loaded data. The model chooses tools and writes the explanation. Tools return the totals, shares and trends a question needs, and the model uses them rather than computing its own; a figure it rounds or derives from cited ones is stated as approximate ("about", "roughly") and cites the figures it came from. If answers keep needing a number no tool returns, add or extend a tool on the data server, with a test pinning it to known cases, rather than relying on the model's arithmetic.

### Citations are part of the result, not decoration

Every tool result carries the citation objects behind it (source, title, provision or table, version or effective date, source URL, language, and stable source and citation IDs). The agent assembles citations from those objects; it never writes a citation from the model's text. A claim with no citation object behind it is not made.

### Tool errors are results

A tool that finds nothing, or can't answer, returns a typed error as its result rather than failing the transport. The model then says "no data" instead of guessing. Transport failures (a server unreachable on the private network) are a different thing, reported as such to the caller and in the trace.

### Transactions are consistency boundaries

A load's manifest row and its data rows are one fact, so they're written in one transaction. The same holds for a passage and its translation and embedding. If you want a transaction that spans two contexts, you've found a boundary error, not a transaction problem.

### Plain data, rules at the boundary

Our models are plain data with rules in functions, which looks like Martin Fowler's [AnemicDomainModel](https://martinfowler.com/bliki/AnemicDomainModel.html) anti-pattern. The critique assumes encapsulation is the only way to guarantee an invariant; types and decoding are the other way. A value that fails a schema never gets past the boundary, so nothing downstream has to re-check it. Scott Wlaschin's [_Domain Modeling Made Functional_](https://pragprog.com/titles/swdddf/domain-modeling-made-functional/) is the long version.

### Separate wire and storage types

An MCP tool's output schema and the repo's row type describe overlapping data and stay separate types on purpose. The same holds for the backend API and the `app` tables. Collapsing them couples the contract to the tables: the day you add a column you don't want to publish, the shared type breaks. Map between them explicitly at the repo boundary.

### Ubiquitous language

The vocabulary lives in [Ubiquitous Language](./ubiquitous-language.md). If a term is in that table, the code spells it that way; if the code needs a new term, add it there in the same PR. Housing law in two countries uses different concepts for similar things, so the vocabulary has to be written down and defended rather than discovered.

---

## Troubleshooting

**Symptom:** A tool handler or the agent loop imports a Postgres client, an HTTP client or a model SDK directly.
**Fix:** Move the access into an adapter (a repo, the MCP client, the model layer) and depend on its service. The domain should run in a test with stubs.

**Symptom:** An `HttpApi` handler or an MCP tool registration is growing conditionals and defaults.
**Fix:** Those are business rules. Move them into the domain call; the adapter only translates.

**Symptom:** The agent needs a number no tool returns.
**Fix:** Add or extend a tool on the city's data server, backed by a tested query. Don't compute it in the agent; a model's rounded or derived figure is acceptable only when stated as approximate.

**Symptom:** A server wants to read another server's schema, or the agent wants to query a schema directly.
**Fix:** Call that server's tool instead. If no tool fits, the tool design is incomplete.

**Symptom:** Two contexts need the same logic and importing feels easier.
**Fix:** Either it belongs to one context and the other calls its published contract, or, for the backend and the browser app only, it's a schema that belongs in `protocol/`. "It was easier to import" isn't a third option.

---

## Reading list

1. Martin Fowler, [DomainDrivenDesign](https://martinfowler.com/bliki/DomainDrivenDesign.html) and [UbiquitousLanguage](https://martinfowler.com/bliki/UbiquitousLanguage.html): ten minutes, and they frame everything else.
2. Alistair Cockburn, [Hexagonal Architecture (Ports and Adapters)](https://alistair.cockburn.us/hexagonal-architecture/): the original, and short.
3. Netflix, [Ready for changes with Hexagonal Architecture](https://netflixtechblog.com/ready-for-changes-with-hexagonal-architecture-b315ec967749): the same idea with a worked example.
4. Scott Wlaschin, [_Domain Modeling Made Functional_](https://pragprog.com/titles/swdddf/domain-modeling-made-functional/): DDD without objects, the closest match to how we use schemas.
5. Eric Evans, [_Domain-Driven Design_](https://www.domainlanguage.com/ddd/) (2003) and Vaughn Vernon, _Implementing Domain-Driven Design_ (2013): the sources, when the short versions stop answering your question.
