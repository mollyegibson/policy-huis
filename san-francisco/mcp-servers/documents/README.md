# sf-docs MCP server

The San Francisco docs server: three tools over the `sf_docs` schema that [`san-francisco/ingest/documents/`](../../ingest/documents/README.md) builds, served by Effect's `McpServer` over Streamable HTTP at `/mcp`. The tools are designed in the [San Francisco Plan](../../../docs/plans/sf-plan.md#docs-server-tools-phase-2); search follows [spike S4's decision](../../../docs/plans/spikes/s4-embeddings.md#decision).

| Tool | Returns |
|---|---|
| `search_policy` | The provisions nearest a query, best first, each ranked by its nearest search entry (its own text, or its text with its descendants or an outline of its children), with its parent and number of children |
| `get_provision` | A provision's own text and an outline of its children |
| `list_provisions` | A document's sections, or one provision's children, as an outline: number, one-line summary, number of children |

| File | Contents |
|---|---|
| `src/Tools.ts` | Tool names, parameters, results and descriptions |
| `src/SearchConfig.ts` | `config/search.yaml`: the embedding API, model and host, and the query instruction |
| `src/PassageRepo.ts` | Read-only SQL over the `sf_docs` schema; every row is decoded with a schema |
| `src/QueryEmbedder.ts` | Embeds a search query with the configured model and host, through OpenRouter |
| `src/Handlers.ts` | Input checks and results |
| `src/Citations.ts` | The citation schema, by the citation convention, and each provision's citation |
| `src/ToolErrors.ts` | The tool errors (`UnknownValue`, `DatabaseUnavailable`, `DataUnavailable`) and `withDataErrors`, which maps database failures to them |
| `src/Params.ts`, `src/Formats.ts` | `OptionalParam` for optional tool inputs, which accepts `null`; dates and counts |
| `src/SfDocsServerConfig.ts` | Every environment variable the server reads, as config services read once at startup |
| `src/Server.ts`, `src/main.ts` | The startup check of the stored embedding model, the database connection and the HTTP server |
| `test/` | Tests through Effect's in-memory MCP client against a throwaway PostGIS-with-pgvector database holding a synthetic `sf_docs` schema, and of the query embedder against a fake OpenRouter |

## Run

```sh
cp .env.example .env   # the read-only sf_docs_reader connection string and a port; .env is gitignored
yarn start
```

The server connects as `sf_docs_reader`, which can read only the `sf_docs` schema. Search queries are embedded through OpenRouter, with the API key in `.env` as `OPENROUTER_API_KEY`.

## What the model sees

At startup the server reads `sf_docs.documents` and writes the corpus into its tool descriptions: `search_policy` lists each document's ID, type and description (from the documents ingestion's `config/corpus.yaml`), with no titles or versions, since no tool description holds a digit, and `get_provision` and `list_provisions` list the document IDs. So the model knows which documents it can search, and their IDs, from the tool list alone. A corpus change needs this server restarted, then the backend, which lists tools when it connects.

## Embedding model

The database is the only link to the passage pipeline. The pipeline stores the model and host it embedded each search entry with (`qwen/qwen3-embedding-4b@deepinfra`); this server embeds queries with the model and host in its own `config/search.yaml` and stops at startup if any stored entry carries another. Every request pins the host with fallbacks off, since OpenRouter's hosts may serve different quantizations of one model. A change of model or host is made in both projects' `config/search.yaml`, then the pipeline is rerun (`sf-docs-ingest passages`), then this server restarted.

A search fails with `EmbeddingModelUnavailable` when the model cannot be reached, is served by another host, or returns an unusable vector; `get_provision` and `list_provisions` do not need it.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. Docker must be running for the tests.

## Results

Each tool returns its result as MCP `structuredContent`, declared by the tool's `outputSchema`, with a citation for every provision it returns in `citations`, following the [citation convention](../../../docs/domain-driven-design.md#conventions-between-servers-and-the-backend); the schema is in `src/Citations.ts`, and the server imports nothing from `protocol/`. Citation IDs are `sf_docs.<documentId>@<versionDate>#<provision>`, and a law's provision is its `locator` ("Sec. 37.9(a)(8)"). A passage's citation quotes its text; an outline entry's citation quotes its summary, which is the provision's heading or its first sentence, verbatim. Each citation also carries the document's `documentType`, for the model. Each tool publishes a title (`Tool.Title`), which the browser app shows for each lookup.
