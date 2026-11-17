# Amsterdam data ingestion

Amsterdam's sources, the `raw_ams_data` migrations and the dbt project that builds the `ams_data` schema the
`ams-data` MCP server reads. Fetching, archiving and loading come from the shared library in
[`shared/ingest/`](../../../shared/ingest/README.md). The design is in the
[Netherlands (Amsterdam) Implementation Plan](../../../docs/plans/amsterdam-implementation.md).

| Path | Contents |
|---|---|
| `config/sources.yaml` | The sources loaded into `raw_ams_data`; each is added once its access method, format, license and size are checked |
| `migrations/` | Alembic migrations (raw SQL) for `raw_ams_data`, the `ams_data` schema and the `ams_data_reader` role |
| `dbt/` | The `ams_data` models and their tests; uses the shared `policyhuis_macros` package |
| `src/ams_data_ingest/` | Settings and the `ams-data-ingest` command |

## Setup

```sh
cp .env.example .env   # then fill in the values; .env is gitignored
uv sync
```

## Run

```sh
uv run alembic upgrade head                    # create raw_ams_data, ams_data and the ams_data_reader role (owner only)
uv run ams-data-ingest ingest                        # download, archive and load every source in config/sources.yaml
uv run ams-data-ingest ingest <source>               # or named sources only
uv run ams-data-ingest dbt build                     # build and test the ams_data models
```

A source whose data is unchanged since its last load is skipped.

## Check

```sh
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Tests run against a throwaway PostGIS container (`imresamu/postgis:17-3.5`), so Docker must be running. They never
touch a real database.
