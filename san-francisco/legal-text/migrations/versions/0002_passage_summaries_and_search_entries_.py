"""passage summaries and search entries with embeddings

Passages are derived from the loaded pages, so this migration deletes them to add the required `summary` column;
`sf-legal-text passages` rebuilds them, with their search entries, afterwards. The embedding dimension, 2,560, is
`qwen3-embedding:4b`'s, the model spike S4 chose; another model needs a new migration.

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("DELETE FROM policy_text_sf.passages")
    op.execute("ALTER TABLE policy_text_sf.passages ADD COLUMN summary text NOT NULL")
    op.execute(
        """
        CREATE TABLE policy_text_sf.search_entries (
            entry_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            document_id     text NOT NULL,
            provision       text NOT NULL,
            kind            text NOT NULL CHECK (kind IN ('own', 'subtree', 'outline')),
            text            text NOT NULL,
            embedding       halfvec(2560) NOT NULL,
            embedding_model text NOT NULL,
            FOREIGN KEY (document_id, provision) REFERENCES policy_text_sf.passages (document_id, provision),
            UNIQUE (document_id, provision, kind)
        )
        """
    )
    op.execute(
        "CREATE INDEX search_entries_embedding ON policy_text_sf.search_entries "
        "USING hnsw (embedding halfvec_cosine_ops)"
    )
    op.execute("GRANT SELECT ON policy_text_sf.search_entries TO sf_legal_text_reader")


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
