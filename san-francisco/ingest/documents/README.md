# San Francisco documents ingestion

The documents the [`sf-docs` server](../../mcp-servers/documents/README.md) answers from, the `raw_sf_docs` and `sf_docs` migrations for the `sf-docs` database, and the passage pipeline that splits each document into passages and embeds their search entries. Loading comes from the shared library in [`shared/ingest/`](../../../shared/ingest/README.md). The design is in the [San Francisco Plan](../../../docs/plans/sf-plan.md#phase-2-documents).

| Path | Contents |
|---|---|
| `config/sources.yaml` | How to fetch each document: PDFs, loaded into `raw_sf_docs.document_pages` one row per page |
| `config/corpus.yaml` | Corpus membership: each document's type, a description of what it covers, and the rule that splits it. The docs server shows each description to the model, so word it from the document itself, as a reader would ask |
| `config/search.yaml` | How search entries are built: the embedding model and its pinned build, its context, and the size limit for a provision's entry with its descendants |
| `migrations/` | Alembic migrations (raw SQL) for `raw_sf_docs`, `sf_docs` and the `sf_docs_reader` role |
| `src/sf_docs_ingest/rent_ordinance.py` | The rules for the Rent Board's copy of Chapter 37 |
| `src/sf_docs_ingest/passages/` | Splitting a section into passages along its enumerated subsections ((a), (1), (A), (i), (I)), each passage's summary, its search entries, embedding with a pinned Ollama build, and writing a document with its passages and entries in one transaction |
| `src/sf_docs_ingest/corpus.py`, `cli.py` | Building passages from loaded pages, and the `sf-docs-ingest` command |

## Setup

```sh
cp .env.example .env   # then fill in the values; .env is gitignored
uv sync
```

## Run

```sh
uv run alembic upgrade head                          # create the schemas and the reader role (database owner only)
uv run sf-docs-ingest ingest                          # download, archive and load every document in config/sources.yaml
uv run sf-docs-ingest ingest --archive-dir ~/policyhuis-archive  # or archive outside the repo, for a local dry run
uv run sf-docs-ingest passages                        # split the loaded documents into passages and embed their search entries
```

A document whose file is unchanged since its last load is skipped; `passages` replaces each document's passages and search entries, and needs the embedding model running in Ollama. Migration 0002 deletes the documents and their passages to add each document's description, so run `passages` after applying it, then restart the docs server and the backend, so the model sees the descriptions.

## Embedding model

`passages` embeds the search entries with a model served by [Ollama](https://ollama.com/download/mac) on the same machine; installing Ollama is step 4 of "Running locally" in the [repo README](../../../README.md#running-locally). The model, chosen by [spike S4](../../../docs/plans/spikes/s4-embeddings.md#decision), is pinned in `config/search.yaml`:

```sh
ollama pull qwen3-embedding:4b
ollama list   # check the ID is df5bd2e3c74c, the build in config/search.yaml (2,560 dimensions)
```

`passages` refuses any other build, so stored vectors always come from the configured one, and stores the model and build with every entry. The server embeds questions with the build in its own `config/search.yaml` and refuses to start unless the two match, so a change of model is made in both files. At the configured 4,096-token context the model holds about 3 GB.

Ollama serves every pulled model from one API (`http://localhost:11434`), so no separate process is needed; it loads a model on its first request and unloads it after a few idle minutes.

## Check

```sh
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Tests run against a throwaway PostGIS container with pgvector (`imresamu/postgis:17-3.5-bundle0-bookworm`), so Docker must be running. They embed with a fake model, so they need no Ollama. They never touch a real database.
