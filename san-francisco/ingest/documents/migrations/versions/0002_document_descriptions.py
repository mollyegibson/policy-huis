"""document descriptions

Each document gets a required `description`, from its entry in `config/corpus.yaml`, which the docs server shows to the
model. Documents, passages and search entries are derived from the loaded pages, so this migration deletes them to add
the column; `sf-docs-ingest passages` rebuilds them afterwards.

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM sf_docs.search_entries")
    op.execute("DELETE FROM sf_docs.passages")
    op.execute("DELETE FROM sf_docs.documents")
    op.execute("ALTER TABLE sf_docs.documents ADD COLUMN description text NOT NULL")


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
