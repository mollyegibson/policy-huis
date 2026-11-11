from collections.abc import Iterator

import psycopg
import pytest
from testcontainers.community.postgres import PostgresContainer

POSTGIS_IMAGE = "imresamu/postgis:17-3.5"

RAW_SCHEMA_DDL = """
CREATE EXTENSION IF NOT EXISTS postgis;
DROP SCHEMA IF EXISTS raw_test CASCADE;
CREATE SCHEMA raw_test;
CREATE TABLE raw_test.load_manifest (
    load_id uuid PRIMARY KEY, source_key text NOT NULL, source_url text NOT NULL, data_url text NOT NULL,
    source_version date NOT NULL, archive_key text NOT NULL, archive_sha256 char(64) NOT NULL,
    metadata_archive_key text NOT NULL, license text, source_title text NOT NULL, publisher text,
    publisher_description text, row_count integer NOT NULL, loader_version text NOT NULL,
    loaded_at timestamptz NOT NULL DEFAULT now(), UNIQUE (source_key, archive_sha256)
);
CREATE TABLE raw_test.rows (
    load_id uuid NOT NULL REFERENCES raw_test.load_manifest, row_number integer NOT NULL,
    record jsonb NOT NULL, geom geometry(Geometry, 4326), PRIMARY KEY (load_id, row_number)
);
CREATE TABLE raw_test.zones (LIKE raw_test.rows INCLUDING ALL);
CREATE TABLE raw_test.document_pages (LIKE raw_test.rows INCLUDING ALL);
"""


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    with PostgresContainer(POSTGIS_IMAGE, driver=None) as container:
        yield container.get_connection_url()


@pytest.fixture
def raw_schema_url(database_url: str) -> str:
    """A database with a fresh `raw_test` schema shaped as `ingest` expects."""
    with psycopg.connect(database_url, autocommit=True) as conn:
        conn.execute(RAW_SCHEMA_DDL)
    return database_url
