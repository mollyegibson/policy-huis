# San Francisco ingestion

San Francisco's sources, the `raw_sf_data` migrations and the dbt project that builds the `sf_data` schema the `sf-data` MCP server reads. Fetching, archiving and loading come from the shared library in [`shared/ingest/`](../../../shared/ingest/README.md). The design is in the [San Francisco Plan](../../../docs/plans/sf-plan.md).

| Path | Contents |
|---|---|
| `config/sources.yaml` | The sources loaded into `raw_sf_data` |
| `migrations/` | Alembic migrations (raw SQL) for `raw_sf_data`, the `sf_data` schema and the `sf_data_reader` role |
| `dbt/` | The `sf_data` models and their tests; uses the shared `policyhuis_macros` package |
| `src/sf_data_ingest/` | Settings and the `sf-data-ingest` command |

## Setup

```sh
cp .env.example .env   # then fill in the values; .env is gitignored
uv sync
```

## Run

```sh
uv run alembic upgrade head                    # create raw_sf_data, sf_data and the sf_data_reader role (database owner only)
uv run sf-data-ingest ingest                        # download, archive and load every source in config/sources.yaml
uv run sf-data-ingest ingest affordable_pipeline    # or named sources only
uv run sf-data-ingest dbt build                     # build and test the sf_data models
```

A source whose data is unchanged since its last load is skipped.

## Check

```sh
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Tests run against a throwaway PostGIS container (`imresamu/postgis:17-3.5`, a multi-architecture build of PostGIS 3.5 on Postgres 17), so Docker must be running. They never touch a real database.
