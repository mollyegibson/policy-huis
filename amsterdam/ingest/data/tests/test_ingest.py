import psycopg
from policyhuis_ingest.source_types import load_sources

from ams_data_ingest.settings import RAW_SCHEMA, SOURCES_FILE


def test_reader_role_can_read_ams_but_not_raw(migrated_url: str) -> None:
    with psycopg.connect(migrated_url, autocommit=True) as conn:
        conn.execute("CREATE TABLE ams_data.probe (x int)")
        raw = conn.execute("SELECT has_schema_privilege('ams_data_reader', 'raw_ams_data', 'USAGE')").fetchone()
        reader = conn.execute("SELECT has_table_privilege('ams_data_reader', 'ams_data.probe', 'SELECT')").fetchone()

    assert raw == (False,)
    assert reader == (True,)


def test_config_declares_the_sources() -> None:
    assert set(load_sources(SOURCES_FILE)) == {"nieuwbouwplannen", "inside_airbnb_listings", "ep_online_energielabels"}
    assert RAW_SCHEMA == "raw_ams_data"
