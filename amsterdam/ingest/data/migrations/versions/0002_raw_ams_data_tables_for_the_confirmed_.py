"""raw_ams_data tables for the confirmed Amsterdam sources

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

RAW_TABLES = ("nieuwbouwplannen", "inside_airbnb_listings")


def upgrade() -> None:
    for table in RAW_TABLES:
        op.execute(
            f"""
            CREATE TABLE raw_ams_data.{table} (
                load_id    uuid NOT NULL REFERENCES raw_ams_data.load_manifest,
                row_number integer NOT NULL,
                record     jsonb NOT NULL,
                geom       geometry(Geometry, 4326),
                PRIMARY KEY (load_id, row_number)
            )
            """
        )


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
