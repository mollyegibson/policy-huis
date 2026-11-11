"""raw_sf and policy_text_sf schemas, document pages, passages and the sf_legal_text_reader role

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
    op.execute(
        """
        CREATE TABLE raw_sf.document_pages (
            load_id    uuid NOT NULL REFERENCES raw_sf.load_manifest,
            row_number integer NOT NULL,
            record     jsonb NOT NULL,
            geom       geometry(Geometry, 4326),
            PRIMARY KEY (load_id, row_number)
        )
        """
    )

    op.execute("CREATE SCHEMA policy_text_sf")
    op.execute(
        """
        CREATE TABLE policy_text_sf.documents (
            document_id     text PRIMARY KEY,
            title           text NOT NULL,
            document_type   text NOT NULL CHECK (document_type IN ('law', 'report', 'reference')),
            publisher       text NOT NULL,
            version_date    date NOT NULL,
            source_url      text NOT NULL,
            load_id         uuid NOT NULL REFERENCES raw_sf.load_manifest,
            archive_sha256  char(64) NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE policy_text_sf.passages (
            passage_id        uuid PRIMARY KEY,
            document_id       text NOT NULL REFERENCES policy_text_sf.documents,
            provision         text NOT NULL,
            parent_provision  text,
            heading           text NOT NULL,
            ordinal           integer NOT NULL,
            context           text NOT NULL,
            text              text NOT NULL,
            tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', context || ' ' || text)) STORED,
            UNIQUE (document_id, provision)
        )
        """
    )
    op.execute("CREATE INDEX passages_tsv ON policy_text_sf.passages USING gin (tsv)")

    password = op.get_context().config.attributes["reader_password"]
    op.get_bind().exec_driver_sql(
        sql.SQL("CREATE ROLE sf_legal_text_reader LOGIN PASSWORD {}").format(sql.Literal(password)).as_string()
    )
    op.execute("GRANT USAGE ON SCHEMA policy_text_sf TO sf_legal_text_reader")
    op.execute("GRANT SELECT ON ALL TABLES IN SCHEMA policy_text_sf TO sf_legal_text_reader")


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
