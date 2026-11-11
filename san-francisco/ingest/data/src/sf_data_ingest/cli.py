import argparse
import sys

import psycopg
from policyhuis_ingest.archive import S3Archive
from policyhuis_ingest.dbt import run_dbt
from policyhuis_ingest.http import HttpFetcher
from policyhuis_ingest.load import ingest, loader_version
from policyhuis_ingest.source_types import load_sources

from sf_data_ingest.settings import DBT_PROJECT, PROJECT_DIR, RAW_SCHEMA, SOURCES_FILE, Settings


def main() -> None:
    parser = argparse.ArgumentParser(prog="sf-data-ingest")
    commands = parser.add_subparsers(dest="command", required=True)
    ingest_parser = commands.add_parser("ingest", help="download, archive and load sources into raw_sf_data")
    ingest_parser.add_argument("sources", nargs="*", help="source keys from config/sources.yaml; all if none")
    dbt_parser = commands.add_parser("dbt", help="run dbt against the sf-data database")
    dbt_parser.add_argument("dbt_args", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    settings = Settings()
    database_url = settings.sf_data_database_url.get_secret_value()

    if args.command == "dbt":
        sys.exit(run_dbt(DBT_PROJECT, database_url, args.dbt_args))

    sources = load_sources(SOURCES_FILE)
    keys = args.sources or list(sources)
    unknown = [k for k in keys if k not in sources]
    if unknown:
        parser.error(f"unknown sources: {', '.join(unknown)}")
    archive = S3Archive(
        endpoint=settings.neon_s3_endpoint,
        region=settings.neon_s3_region,
        bucket=settings.neon_s3_bucket,
        access_key_id=settings.neon_s3_access_key_id,
        secret_access_key=settings.neon_s3_secret_access_key,
    )
    fetcher = HttpFetcher()
    version = loader_version(PROJECT_DIR)
    with psycopg.connect(database_url, autocommit=True) as conn:
        for key in keys:
            result = ingest(key, sources[key], fetcher, archive, conn, RAW_SCHEMA, version)
            status = "unchanged, skipped" if result.skipped else f"{result.row_count} rows, load {result.load_id}"
            print(f"{key}: {status}")
