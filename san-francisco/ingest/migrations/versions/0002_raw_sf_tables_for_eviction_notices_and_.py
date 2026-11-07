"""raw_sf tables for eviction notices and the eviction report

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


RAW_TABLES = ("eviction_notices", "eviction_report")


def upgrade() -> None:
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


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
