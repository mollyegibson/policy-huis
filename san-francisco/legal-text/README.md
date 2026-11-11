# San Francisco legal-text corpus

The documents the [`sf-legal-text` server](../legal-text-server/README.md) answers from, the `raw_sf` and `policy_text_sf` migrations for the `sf-legal-text` database, and the rules that split each document into passages. Loading comes from [`shared/ingest/`](../../shared/ingest/README.md) and splitting from [`shared/legal-text/pipeline/`](../../shared/legal-text/pipeline/README.md). The design is in the [San Francisco Plan](../../docs/plans/sf-plan.md#phase-2-documents).

| Path | Contents |
|---|---|
| `config/sources.yaml` | How to fetch each document: PDFs, loaded into `raw_sf.document_pages` one row per page |
| `config/corpus.yaml` | Corpus membership: each document's type and the rule that splits it |
| `config/search.yaml` | How search entries are built: the embedding model and its pinned build, its context, and the size limit for a provision's entry with its descendants |
| `migrations/` | Alembic migrations (raw SQL) for `raw_sf`, `policy_text_sf` and the `sf_legal_text_reader` role |
| `src/sf_legal_text/rent_ordinance.py` | The rules for the Rent Board's copy of Chapter 37 |
| `src/sf_legal_text/corpus.py`, `cli.py` | Building passages from loaded pages, and the `sf-legal-text` command |
| `spikes/s4/` | Spike S4's search harness |

## Setup

```sh
cp .env.example .env   # then fill in the values; .env is gitignored
uv sync
```

## Run

```sh
uv run alembic upgrade head                          # create the schemas and the reader role (database owner only)
uv run sf-legal-text ingest                          # download, archive and load every document in config/sources.yaml
uv run sf-legal-text ingest --archive-dir ~/policyhuis-archive  # or archive outside the repo, for a local dry run
uv run sf-legal-text passages                        # split the loaded documents into passages and embed their search entries
```

A document whose file is unchanged since its last load is skipped; `passages` replaces each document's passages and search entries, and needs the embedding model running in Ollama. Migration 0002 deletes the passages to add their summaries, so run `passages` after applying it.

## Embedding model

`passages` embeds the search entries with a model served by [Ollama](https://ollama.com/download/mac) on the same machine; installing Ollama is step 4 of "Running locally" in the [repo README](../../README.md#running-locally). The model, chosen by [spike S4](../../docs/plans/spikes/s4-embeddings.md#decision), is pinned in `config/search.yaml`:

```sh
ollama pull qwen3-embedding:4b
ollama list   # check the ID is df5bd2e3c74c, the build in config/search.yaml (2,560 dimensions)
```

`passages` refuses any other build, so stored vectors always come from the configured one, and stores the model and build with every entry. The server embeds questions with the build in its own `config/search.yaml` and refuses to start unless the two match, so a change of model is made in both files. At the configured 4,096-token context the model holds about 3 GB.

Ollama serves every pulled model from one API (`http://localhost:11434`), so no separate process is needed; it loads a model on its first request and unloads it after a few idle minutes.

## Spike S4

Scores keyword, vector and hybrid search against the questions in [`docs/plans/spikes/s4-questions.yaml`](../../docs/plans/spikes/s4-questions.yaml). It reads the passages from the database and writes nothing. The design and results are in [Spike S4](../../docs/plans/spikes/s4-embeddings.md).

```sh
uv run python spikes/s4/search.py --model qwen3-embedding:4b --form subtree --num-ctx 4096
```

## Check

```sh
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Tests run against a throwaway PostGIS container with pgvector (`imresamu/postgis:17-3.5-bundle0-bookworm`), so Docker must be running. They embed with a fake model, so they need no Ollama. They never touch a real database.
