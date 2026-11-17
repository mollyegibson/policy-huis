# Amsterdam documents ingestion

The documents the [`ams-docs` server](../../mcp-servers/documents/README.md) answers from, the `raw_ams_docs` and
`ams_docs` migrations for the `ams-docs` database, and the passage pipeline that splits each document into passages,
translates them to English and embeds their search entries. Loading comes from the shared library in
[`shared/ingest/`](../../../shared/ingest/README.md). The design is in the
[Netherlands (Amsterdam) Implementation Plan](../../../docs/plans/amsterdam-implementation.md).

| Path | Contents |
|---|---|
| `config/sources.yaml` | How to fetch each document: PDFs, loaded into `raw_ams_docs.document_pages` one row per page |
| `config/corpus.yaml` | Corpus membership: each document's type, a description of what it covers, and the rule that splits it |
| `config/search.yaml` | How search entries are built and passages translated: the embedding API, model and host, and the translation model |
| `migrations/` | Alembic migrations (raw SQL) for `raw_ams_docs`, `ams_docs` and the `ams_docs_reader` role |
| `src/ams_docs_ingest/passages/` | Splitting a document into passages, translation, each passage's summary, its search entries, embedding, and writing a document with its passages and entries in one transaction |
| `src/ams_docs_ingest/housing_ordinance.py`, `woningbouwplan.py`, `council_document.py` | The rules for each document's layout |
| `src/ams_docs_ingest/corpus.py`, `cli.py` | Building passages from loaded pages, and the `ams-docs-ingest` command |

## Setup

```sh
cp .env.example .env   # then fill in the values; .env is gitignored
uv sync
```

## Run

```sh
uv run alembic upgrade head                          # create the schemas and the reader role (database owner only)
uv run ams-docs-ingest ingest                          # download, archive and load every document in config/sources.yaml
uv run ams-docs-ingest ingest --archive-dir ~/policyhuis-archive   # or archive outside the repo, for a local dry run
uv run ams-docs-ingest passages                        # split, translate and embed the loaded documents
```

A document whose file is unchanged since its last load is skipped; `passages` replaces each document's passages and
search entries, and needs `OPENROUTER_API_KEY` and `translation_model` in `config/search.yaml`.

## Translation

`passages` translates each Dutch passage to English once, at load time, and stores both texts and the translation
model's identifier. The docs server reads the English text and cites the Dutch original; the browser app labels the
translation as machine translation. The translation model is chosen in spike S3, and the embedding model and host
are confirmed by the Dutch run of spike S4.

## Check

```sh
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Tests run against a throwaway PostGIS container with pgvector
(`imresamu/postgis:17-3.5-bundle0-bookworm`), so Docker must be running. They embed and translate with fakes, so
they need no API key. They never touch a real database.
