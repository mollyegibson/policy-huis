# sf-legal-text MCP server

The San Francisco legal-text server: three tools over the `policy_text_sf` schema that [`san-francisco/legal-text/`](../legal-text/README.md) builds, served by Effect's `McpServer` over Streamable HTTP at `/mcp`. The tools are designed in the [San Francisco Plan](../../docs/plans/sf-plan.md#legal-text-tools-phase-2); search follows [spike S4's decision](../../docs/plans/spikes/s4-embeddings.md#decision).

| Tool | Returns |
|---|---|
| `search_policy` | The provisions nearest a query, best first, each ranked by its nearest search entry (its own text, or its text with its descendants or an outline of its children), with its parent and number of children |
| `get_provision` | A provision with all its descendants in document order, or, over `subtree_chars`, the provision with an outline of its children |
| `list_provisions` | A document's sections, or one provision's children, as an outline: number, one-line summary, number of children |

| File | Contents |
|---|---|
| `src/Tools.ts` | Tool names, parameters, results and descriptions |
| `src/SearchConfig.ts` | `config/search.yaml`: the embedding model and build, its context, the query instruction and `get_provision`'s size limit |
| `src/PassageRepo.ts` | Read-only SQL over the `policy_text_sf` schema; every row is decoded with a schema |
| `src/QueryEmbedder.ts` | Embeds a search query with the configured Ollama model build |
| `src/Handlers.ts` | Input checks, the size limit, results and citations |
| `src/Server.ts`, `src/main.ts` | Configuration, the startup check of the stored embedding model, the database connection and the HTTP server |
| `test/` | Tests through Effect's in-memory MCP client against a throwaway PostGIS-with-pgvector database holding a synthetic `policy_text_sf` schema, and of the query embedder against a fake Ollama |

## Run

```sh
cp .env.example .env   # the read-only sf_legal_text_reader connection string and a port; .env is gitignored
yarn start
```

The server connects as `sf_legal_text_reader`, which can read only the `policy_text_sf` schema. Ollama must serve the build in `config/search.yaml` (`ollama pull qwen3-embedding:4b`); `OLLAMA_URL` in `.env` overrides its default address.

## Embedding model

The database is the only link to the passage pipeline. The pipeline stores the model and build it embedded each search entry with (`qwen3-embedding:4b@df5bd2e3c74c`); this server embeds queries with the build in its own `config/search.yaml` and stops at startup if any stored entry carries another. A change of model is made in both projects' `config/search.yaml`, then the pipeline is rerun (`sf-legal-text passages`), then this server restarted.

A search fails with `EmbeddingModelUnavailable` when the model cannot be reached, serves another build, or returns an unusable vector; `get_provision` and `list_provisions` do not need it.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. Docker must be running for the tests.

## Results

Each tool returns its result as MCP `structuredContent`, declared by the tool's `outputSchema`, with a `LegalCitation` for every provision it returns in `citations`. A passage's citation quotes its text; an outline entry's citation quotes its summary, which is the provision's heading or its first sentence, verbatim. Citation IDs follow the rule in [`protocol/`](../../protocol/src/Citation.ts): `<documentId>@<versionDate>#<provision>`.
