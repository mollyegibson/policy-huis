from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest
from alembic import command
from alembic.config import Config
from pydantic import SecretStr
from testcontainers.community.postgres import PostgresContainer

from sf_ingest.settings import Settings

PIPELINES = Path(__file__).resolve().parents[1]
POSTGIS_IMAGE = "imresamu/postgis:17-3.5"


def make_settings(database_url: str) -> Settings:
    return Settings(
        sf_housing_database_url=SecretStr(database_url),
        sf_housing_reader_password=SecretStr("reader-test-password"),
        neon_s3_endpoint="http://unused.invalid",
        neon_s3_region="unused",
        neon_s3_bucket="unused",
        neon_s3_access_key_id=SecretStr("unused"),
        neon_s3_secret_access_key=SecretStr("unused"),
    )


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    with PostgresContainer(POSTGIS_IMAGE, driver=None) as container:
        yield container.get_connection_url()


@pytest.fixture
def migrated_url(database_url: str) -> Iterator[str]:
    """A database with the migrations applied, reset before each test."""
    with psycopg.connect(database_url, autocommit=True) as conn:
        conn.execute("DROP SCHEMA IF EXISTS raw_sf CASCADE")
        conn.execute("DROP SCHEMA IF EXISTS sf CASCADE")
        conn.execute("DROP TABLE IF EXISTS public.alembic_version")
        if _role_exists(conn):
            conn.execute("DROP OWNED BY sf_housing_reader")
        conn.execute("DROP ROLE IF EXISTS sf_housing_reader")
    config = Config(str(PIPELINES / "alembic.ini"))
    config.attributes["settings"] = make_settings(database_url)
    config.attributes["database_url"] = database_url
    command.upgrade(config, "head")
    yield database_url


def _role_exists(conn: psycopg.Connection) -> bool:
    return conn.execute("SELECT 1 FROM pg_roles WHERE rolname = 'sf_housing_reader'").fetchone() is not None
