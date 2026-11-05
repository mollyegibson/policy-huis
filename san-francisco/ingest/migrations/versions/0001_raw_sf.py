"""raw_sf schema, load manifest, Phase 1 raw tables and the sf_housing_reader role

Revision ID: 0001
Revises:
"""

from alembic import op
from psycopg import sql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

RAW_TABLES = (
    "development_pipeline",
    "affordable_pipeline",
    "analysis_neighborhoods",
    "slr_66in_100yr_storm",
    "air_pollutant_exposure_zone",
    "sfpuc_100yr_storm",
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE SCHEMA raw_sf")
    op.execute(
        """
        CREATE TABLE raw_sf.load_manifest (
            load_id               uuid PRIMARY KEY,
            source_key            text NOT NULL,
            source_url            text NOT NULL,
            data_url              text NOT NULL,
            source_version        date NOT NULL,
            archive_key           text NOT NULL,
            archive_sha256        char(64) NOT NULL,
            metadata_archive_key  text NOT NULL,
            license               text,
            source_title          text NOT NULL,
            publisher             text,
            publisher_description text,
            row_count             integer NOT NULL,
            loader_version        text NOT NULL,
            loaded_at             timestamptz NOT NULL DEFAULT now(),
            UNIQUE (source_key, archive_sha256)
        )
        """
    )
    for table in RAW_TABLES:
        op.execute(
            f"""
            CREATE TABLE raw_sf.{table} (
                load_id    uuid NOT NULL REFERENCES raw_sf.load_manifest,
                row_number integer NOT NULL,
                record     jsonb NOT NULL,
                geom       geometry(Geometry, 4326),
                PRIMARY KEY (load_id, row_number)
            )
            """
        )

    password = op.get_context().config.attributes["reader_password"]
    op.get_bind().exec_driver_sql(
        sql.SQL("CREATE ROLE sf_housing_reader LOGIN PASSWORD {}").format(sql.Literal(password)).as_string()
    )
    op.execute("CREATE SCHEMA sf")
    op.execute("GRANT USAGE ON SCHEMA sf TO sf_housing_reader")
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA sf GRANT SELECT ON TABLES TO sf_housing_reader")


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
