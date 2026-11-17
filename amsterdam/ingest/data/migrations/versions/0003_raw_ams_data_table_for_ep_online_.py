"""raw_ams_data table for the EP-Online energielabels source

Revision ID: 0003
Revises: 0002
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE raw_ams_data.ep_online_energielabels (
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
