# San Francisco ingestion

San Francisco's sources, the `raw_sf` migrations and the dbt project that builds the `sf` schema the `sf-housing` MCP server reads. Fetching, archiving and loading come from the shared library in [`shared/ingest/`](../../shared/ingest/README.md). The design is in the [San Francisco Plan](../../docs/plans/sf-plan.md).

| Path | Contents |
|---|---|
| `config/sources.yaml` | The sources loaded into `raw_sf` |
| `migrations/` | Alembic migrations (raw SQL) for `raw_sf`, the `sf` schema and the `sf_housing_reader` role |
| `dbt/` | The `sf` models and their tests; uses the shared `policyhuis_macros` package |
| `src/sf_ingest/` | Settings and the `sf-ingest` command |

## Setup

```sh
cp .env.example .env   # then fill in the values; .env is gitignored
uv sync
```

## Run

```sh
uv run alembic upgrade head                    # create raw_sf, sf and the sf_housing_reader role (database owner only)
uv run sf-ingest ingest                        # download, archive and load every source in config/sources.yaml
uv run sf-ingest ingest affordable_pipeline    # or named sources only
uv run sf-ingest dbt build                     # build and test the sf models
```

A source whose data is unchanged since its last load is skipped.

## Check

```sh
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Tests run against a throwaway PostGIS container (`imresamu/postgis:17-3.5`, a multi-architecture build of PostGIS 3.5 on Postgres 17), so Docker must be running. They never touch a real database.
