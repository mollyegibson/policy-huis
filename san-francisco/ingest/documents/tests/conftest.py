from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from alembic import command
from alembic.config import Config
from pydantic import SecretStr
from testcontainers.community.postgres import PostgresContainer

from sf_docs_ingest.settings import Settings

PROJECT = Path(__file__).resolve().parents[1]
# PostGIS with pgvector, for the search entries' embeddings.
POSTGIS_IMAGE = "imresamu/postgis:17-3.5-bundle0-bookworm"


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    with PostgresContainer(POSTGIS_IMAGE, driver=None) as container:
        yield container.get_connection_url()


@pytest.fixture
def migrated_url(database_url: str) -> Iterator[str]:
    """A database with the migrations applied, reset before each test."""
    with psycopg.connect(database_url, autocommit=True) as conn:
        conn.execute("DROP SCHEMA IF EXISTS sf_docs CASCADE")
        conn.execute("DROP SCHEMA IF EXISTS raw_sf_docs CASCADE")
        conn.execute("DROP TABLE IF EXISTS public.alembic_version")
        if conn.execute("SELECT 1 FROM pg_roles WHERE rolname = 'sf_docs_reader'").fetchone():
            conn.execute("DROP OWNED BY sf_docs_reader")
        conn.execute("DROP ROLE IF EXISTS sf_docs_reader")
    config = Config(str(PROJECT / "alembic.ini"))
    config.attributes["settings"] = Settings(
        sf_docs_database_url=SecretStr(database_url),
        sf_docs_reader_password=SecretStr("reader-test-password"),
    )
    config.attributes["database_url"] = database_url
    command.upgrade(config, "head")
    yield database_url
