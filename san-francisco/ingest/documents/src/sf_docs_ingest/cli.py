import argparse
from pathlib import Path

import httpx
import psycopg
from policyhuis_ingest.archive import Archive, LocalArchive, S3Archive
from policyhuis_ingest.http import HttpFetcher
from policyhuis_ingest.load import ingest, loader_version
from policyhuis_ingest.source_types import load_sources

from sf_docs_ingest.corpus import build_passages, load_corpus, load_search_config
from sf_docs_ingest.passages.embed import OpenRouterEmbedder
from sf_docs_ingest.settings import (
    CORPUS_FILE,
    CORPUS_SCHEMA,
    PROJECT_DIR,
    RAW_SCHEMA,
    SEARCH_FILE,
    SOURCES_FILE,
    Settings,
)


def _archive(settings: Settings, archive_dir: Path | None) -> Archive:
    if archive_dir is not None:
        return LocalArchive(archive_dir)
    if (
        settings.neon_s3_endpoint is None
        or settings.neon_s3_region is None
        or settings.neon_s3_bucket is None
        or settings.neon_s3_access_key_id is None
        or settings.neon_s3_secret_access_key is None
    ):
        raise SystemExit("Set the NEON_S3_* settings in .env, or pass --archive-dir for a local dry run")
    return S3Archive(
        endpoint=settings.neon_s3_endpoint,
        region=settings.neon_s3_region,
        bucket=settings.neon_s3_bucket,
        access_key_id=settings.neon_s3_access_key_id,
        secret_access_key=settings.neon_s3_secret_access_key,
    )


def main() -> None:
    parser = argparse.ArgumentParser(prog="sf-docs-ingest")
    commands = parser.add_subparsers(dest="command", required=True)
    ingest_parser = commands.add_parser("ingest", help="download, archive and load documents into raw_sf_docs")
    ingest_parser.add_argument("documents", nargs="*", help="document keys from config/sources.yaml; all if none")
    ingest_parser.add_argument("--archive-dir", type=Path, help="archive to this local directory, for a dry run")
    passages_parser = commands.add_parser(
        "passages", help="split loaded documents into passages and embed their search entries in sf_docs"
    )
    passages_parser.add_argument("documents", nargs="*", help="document keys from config/corpus.yaml; all if none")
    args = parser.parse_args()

    settings = Settings()
    database_url = settings.sf_docs_database_url.get_secret_value()

    if args.command == "ingest":
        sources = load_sources(SOURCES_FILE)
        keys = args.documents or list(sources)
        unknown = [k for k in keys if k not in sources]
        if unknown:
            parser.error(f"unknown documents: {', '.join(unknown)}")
        archive = _archive(settings, args.archive_dir)
        fetcher = HttpFetcher()
        version = loader_version(PROJECT_DIR)
        with psycopg.connect(database_url, autocommit=True) as conn:
            for key in keys:
                result = ingest(key, sources[key], fetcher, archive, conn, RAW_SCHEMA, version)
                status = "unchanged, skipped" if result.skipped else f"{result.row_count} pages, load {result.load_id}"
                print(f"{key}: {status}")
        return

    corpus = load_corpus(CORPUS_FILE)
    keys = args.documents or list(corpus)
    unknown = [k for k in keys if k not in corpus]
    if unknown:
        parser.error(f"unknown documents: {', '.join(unknown)}")
    search = load_search_config(SEARCH_FILE)
    if settings.openrouter_api_key is None:
        raise SystemExit("Set OPENROUTER_API_KEY in .env to embed the search entries")
    with httpx.Client(timeout=600) as client:
        embedder = OpenRouterEmbedder(
            client,
            search.embedding_api,
            settings.openrouter_api_key.get_secret_value(),
            search.embedding_model,
            search.embedding_host,
        )
        for key in keys:
            count = build_passages(
                database_url, RAW_SCHEMA, CORPUS_SCHEMA, key, corpus[key], embedder, search.subtree_chars
            )
            print(f"{key}: {count} passages")
