"""raw_sf_docs and sf_docs schemas and the sf_docs_reader role

The embedding dimension, 2,560, is `qwen3-embedding:4b`'s, the model spike S4 chose; another model needs a new
migration.

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
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.execute("CREATE SCHEMA raw_sf_docs")
    op.execute(
        """
        CREATE TABLE raw_sf_docs.load_manifest (
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
        CREATE TABLE raw_sf_docs.document_pages (
            load_id    uuid NOT NULL REFERENCES raw_sf_docs.load_manifest,
            row_number integer NOT NULL,
            record     jsonb NOT NULL,
            geom       geometry(Geometry, 4326),
            PRIMARY KEY (load_id, row_number)
        )
        """
    )

    op.execute("CREATE SCHEMA sf_docs")
    op.execute(
        """
        CREATE TABLE sf_docs.documents (
            document_id     text PRIMARY KEY,
            title           text NOT NULL,
            document_type   text NOT NULL CHECK (document_type IN ('law', 'report', 'reference')),
            publisher       text NOT NULL,
            version_date    date NOT NULL,
            source_url      text NOT NULL,
            load_id         uuid NOT NULL REFERENCES raw_sf_docs.load_manifest,
            archive_sha256  char(64) NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE sf_docs.passages (
            passage_id        uuid PRIMARY KEY,
            document_id       text NOT NULL REFERENCES sf_docs.documents,
            provision         text NOT NULL,
            parent_provision  text,
            heading           text NOT NULL,
            ordinal           integer NOT NULL,
            context           text NOT NULL,
            text              text NOT NULL,
            summary           text NOT NULL,
            tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', context || ' ' || text)) STORED,
            UNIQUE (document_id, provision)
        )
        """
    )
    op.execute("CREATE INDEX passages_tsv ON sf_docs.passages USING gin (tsv)")
    op.execute(
        """
        CREATE TABLE sf_docs.search_entries (
            entry_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            document_id     text NOT NULL,
            provision       text NOT NULL,
            kind            text NOT NULL CHECK (kind IN ('own', 'subtree', 'outline')),
            text            text NOT NULL,
            embedding       halfvec(2560) NOT NULL,
            embedding_model text NOT NULL,
            FOREIGN KEY (document_id, provision) REFERENCES sf_docs.passages (document_id, provision),
            UNIQUE (document_id, provision, kind)
        )
        """
    )
    op.execute(
        "CREATE INDEX search_entries_embedding ON sf_docs.search_entries USING hnsw (embedding halfvec_cosine_ops)"
    )

    password = op.get_context().config.attributes["reader_password"]
    op.get_bind().exec_driver_sql(
        sql.SQL("CREATE ROLE sf_docs_reader LOGIN PASSWORD {}").format(sql.Literal(password)).as_string()
    )
    op.execute("GRANT USAGE ON SCHEMA sf_docs TO sf_docs_reader")
    op.execute("GRANT SELECT ON ALL TABLES IN SCHEMA sf_docs TO sf_docs_reader")


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
