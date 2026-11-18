"""raw_ams_data tables for the CBS StatLine Kerncijfers source

The table's rows and its region-name dimension are separate requests on CBS's service, so each is its own source
and its own raw table.

Revision ID: 0004
Revises: 0003
"""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

RAW_TABLES = ("cbs_kerncijfers", "cbs_region_names")


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
