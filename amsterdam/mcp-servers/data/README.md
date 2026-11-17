# ams-data MCP server

The Amsterdam housing data server: tools over the `ams_data` schema that
[`amsterdam/ingest/data/`](../../ingest/data/README.md) builds, served by Effect's `McpServer` over Streamable HTTP
at `/mcp`. The tools, their schemas and their citations are designed in the
[Netherlands (Amsterdam) Implementation Plan](../../../docs/plans/amsterdam-implementation.md).

| File | Contents |
|---|---|
| `src/Tools.ts` | Tool names, parameters, results and descriptions |
| `src/HousingRepo.ts` | Read-only SQL over the `ams_data` schema; every row is decoded with a schema |
| `src/Handlers.ts` | Input checks against the loaded data, results and citations |
| `src/Citations.ts` | The citation schema, by the citation convention, and dataset citations with their IDs and query keys |
| `src/Locators.ts` | Each tool's citation locator: what the query selected, in words |
| `src/ToolErrors.ts` | The tool errors (`UnknownValue`, `DatabaseUnavailable`, `DataUnavailable`) and `withDataErrors` |
| `src/Params.ts`, `src/Formats.ts` | `OptionalParam` for optional tool inputs, which accepts `null`; dates, months and counts |
| `src/AmsDataServerConfig.ts` | Every environment variable the server reads, as config services read once at startup |
| `src/Server.ts`, `src/main.ts` | The database connection and the HTTP server |
| `test/` | Tests through Effect's in-memory MCP client against a throwaway PostGIS database with a synthetic `ams_data` schema |

## Run

```sh
cp .env.example .env   # the read-only ams_data_reader connection string and a port; .env is gitignored
yarn start
```

The server connects as `ams_data_reader`, which can read only the `ams_data` schema.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. Docker must be running for the
tests.

## Results

Each tool returns its result as MCP `structuredContent`, declared by the tool's `outputSchema`, with the citations
behind it in `citations`, following the
[citation convention](../../../docs/domain-driven-design.md#conventions-between-servers-and-the-backend); the schema is
in `src/Citations.ts`, and the server imports nothing from `protocol/`. Citation IDs are
`ams_data.<datasetKey>@<sourceVersion>#<queryKey>`, and each citation's `locator` says what the query selected, in
words (`src/Locators.ts`). Each tool publishes a title (`Tool.Title`), which the browser app shows for each lookup.
Expected errors, such as an unknown district, come back as error results listing the valid values.
