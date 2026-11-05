# sf-housing MCP server

The San Francisco housing data server: six tools over the `sf` schema that [`san-francisco/ingest/`](../ingest/README.md) builds, served by Effect's `McpServer` over Streamable HTTP at `/mcp`. The tools, their schemas and their citations are designed in the [San Francisco Plan](../../docs/plans/sf-plan.md#data-server-tools).

| File | Contents |
|---|---|
| `src/Tools.ts` | Tool names, parameters, results and descriptions |
| `src/HousingRepo.ts` | Read-only SQL over the `sf` schema; every row is decoded with a schema |
| `src/Handlers.ts` | Input checks against the loaded data, results and citations |
| `src/Server.ts`, `src/main.ts` | Configuration, the database connection and the HTTP server |
| `test/` | Tests through Effect's in-memory MCP client against a throwaway PostGIS database with a synthetic `sf` schema |

## Run

```sh
cp .env.example .env   # the read-only sf_housing_reader connection string and a port; .env is gitignored
yarn start
```

The server connects as `sf_housing_reader`, which can read only the `sf` schema.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. Docker must be running for the tests.

## Results

Each tool returns its result as MCP `structuredContent`, declared by the tool's `outputSchema`, with the citations behind it in `citations`. Citation IDs follow the rule in [`protocol/`](../../protocol/src/Citation.ts) and are built by `shared/mcp-kit`. Expected errors, such as an unknown neighborhood, come back as error results listing the valid values.
