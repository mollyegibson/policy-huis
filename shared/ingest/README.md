# Shared ingestion

A Python library every data node installs: it fetches public sources (datasets on any Socrata portal, such as DataSF, ArcGIS layers, and PDF documents, loaded as one row per page of extracted text), archives each file and its metadata in S3-compatible object storage, and loads the archived bytes into a node's raw schema, writing the load manifest row and data rows in one transaction. It also runs dbt with connection settings taken from a database URL, and holds the dbt macros every node's models share (`dbt/`, installed as the `policyhuis_macros` dbt package).

It knows nothing about any city, and a test fails if its code names one. Source types are in `source_types.py`; a city's list of sources is its own `sources.yaml`. Each node supplies its own `sources.yaml`, raw schema (created by its own migrations), settings and dbt project; see [`san-francisco/ingest/`](../../san-francisco/ingest/README.md).

A node's raw schema must have a `load_manifest` table and one table per source key with the columns `load_id`, `row_number`, `record` (jsonb) and `geom` (PostGIS geometry). The manifest's columns are listed in [`policyhuis_ingest.load.ingest`](src/policyhuis_ingest/load.py) and in the San Francisco migration.

```sh
uv sync
uv run ruff check . && uv run ruff format --check . && uv run pytest   # Docker must be running
```
