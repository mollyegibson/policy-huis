"""raw_ams_data and ams_data schemas and the ams_data_reader role

One raw table per confirmed source key is added by a later migration, as each source's access method, format,
license and size are checked.

Revision ID: 0001
Revises:
"""

from alembic import op
from psycopg import sql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE SCHEMA raw_ams_data")
    op.execute(
        """
        CREATE TABLE raw_ams_data.load_manifest (
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

    password = op.get_context().config.attributes["reader_password"]
    op.get_bind().exec_driver_sql(
        sql.SQL("CREATE ROLE ams_data_reader LOGIN PASSWORD {}").format(sql.Literal(password)).as_string()
    )
    op.execute("CREATE SCHEMA ams_data")
    op.execute("GRANT USAGE ON SCHEMA ams_data TO ams_data_reader")
    op.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA ams_data GRANT SELECT ON TABLES TO ams_data_reader")


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
