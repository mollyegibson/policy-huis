# ams-docs MCP server

The Amsterdam docs server: tools over the `ams_docs` schema that [`amsterdam/ingest/documents/`](../../ingest/documents/README.md)
builds, served by Effect's `McpServer` over Streamable HTTP at `/mcp`. The tools are designed in the
[Netherlands (Amsterdam) Implementation Plan](../../../docs/plans/amsterdam-implementation.md); search follows
spike S4's decision.

| Tool | Returns |
|---|---|
| `search_policy` | The provisions nearest a query, best first, each ranked by its nearest search entry, with its parent and number of children |
| `get_provision` | A provision's own text in Dutch and English, and an outline of its children |
| `list_provisions` | A document's sections, or one provision's children, as an outline: number, one-line summary, number of children |

| File | Contents |
|---|---|
| `src/Tools.ts` | Tool names, parameters, results and descriptions |
| `src/SearchConfig.ts` | `config/search.yaml`: the embedding API, model and host, and the query instruction |
| `src/PassageRepo.ts` | Read-only SQL over the `ams_docs` schema; every row is decoded with a schema |
| `src/QueryEmbedder.ts` | Embeds a search query with the configured model and host, through OpenRouter |
| `src/Handlers.ts` | Input checks and results |
| `src/Citations.ts` | The citation schema, by the citation convention, and each provision's citation |
| `src/ToolErrors.ts` | The tool errors (`UnknownValue`, `DatabaseUnavailable`, `DataUnavailable`) and `withDataErrors` |
| `src/Params.ts`, `src/Formats.ts` | `OptionalParam` for optional tool inputs, which accepts `null`; dates and counts |
| `src/AmsDocsServerConfig.ts` | Every environment variable the server reads, as config services read once at startup |
| `src/Server.ts`, `src/main.ts` | The startup check of the stored embedding model, the database connection and the HTTP server |
| `test/` | Tests through Effect's in-memory MCP client against a throwaway PostGIS-with-pgvector database holding a synthetic `ams_docs` schema |

## Run

```sh
cp .env.example .env   # the read-only ams_docs_reader connection string and a port; .env is gitignored
yarn start
```

The server connects as `ams_docs_reader`, which can read only the `ams_docs` schema. Search queries are embedded
through OpenRouter, with the API key in `.env` as `OPENROUTER_API_KEY`.

## What the model sees

At startup the server reads `ams_docs.documents` and writes the corpus into its tool descriptions: `search_policy`
lists each document's ID, type and description, with no titles or versions, and `get_provision` and
`list_provisions` list the document IDs. A corpus change needs this server restarted, then the backend.

## Embedding model

The database is the only link to the passage pipeline. The pipeline stores the model and host it embedded each
search entry with (`qwen/qwen3-embedding-4b@deepinfra`); this server embeds queries with the model and host in its own
`config/search.yaml` and stops at startup if any stored entry carries another. A search fails with
`EmbeddingModelUnavailable` when the model cannot be reached, is served by another host, or returns an unusable
vector; `get_provision` and `list_provisions` do not need it.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. Docker must be running for the
tests.

## Results

Each tool returns its result as MCP `structuredContent`, declared by the tool's `outputSchema`, with a citation for
every provision it returns in `citations`, following the
[citation convention](../../../docs/domain-driven-design.md#conventions-between-servers-and-the-backend); the schema
is in `src/Citations.ts`, and the server imports nothing from `protocol/`. Citation IDs are
`ams_docs.<documentId>@<versionDate>#<article>`, and a law's article is its `locator` ("artikel 7:248"). A passage's
citation quotes its Dutch original; an outline entry's citation quotes its summary and says whether it is a machine
translation. Each tool publishes a title (`Tool.Title`), which the browser app shows for each lookup.
