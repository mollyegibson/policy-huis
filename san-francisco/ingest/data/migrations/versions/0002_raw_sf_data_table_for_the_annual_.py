"""raw_sf_data table for the annual allowable rent increase

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE raw_sf_data.allowable_rent_increase (
            load_id    uuid NOT NULL REFERENCES raw_sf_data.load_manifest,
            row_number integer NOT NULL,
            record     jsonb NOT NULL,
            geom       geometry(Geometry, 4326),
            PRIMARY KEY (load_id, row_number)
        )
        """
    )


def downgrade() -> None:
    raise NotImplementedError("Migrations are append-only once applied")
