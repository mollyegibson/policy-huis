from pathlib import Path

import psycopg
from policyhuis_ingest.archive import LocalArchive, sha256
from policyhuis_ingest.load import ingest
from policyhuis_ingest.source_types import load_sources
from policyhuis_ingest.testing import FakeFetcher

from sf_data_ingest.settings import RAW_SCHEMA, SOURCES_FILE
from tests.fixtures import all_responses


def test_ingest_archives_then_loads_manifest_and_rows(migrated_url: str, tmp_path: Path) -> None:
    source = load_sources(SOURCES_FILE)["development_pipeline"]
    with psycopg.connect(migrated_url, autocommit=True) as conn:
        result = ingest(
            "development_pipeline", source, FakeFetcher(all_responses()), LocalArchive(tmp_path), conn, RAW_SCHEMA, "v1"
        )
        manifest = conn.execute(
            "SELECT source_url, source_version::text, archive_key, archive_sha256, license, row_count, loader_version "
            "FROM raw_sf_data.load_manifest"
        ).fetchall()
        rows = conn.execute(
            "SELECT record ->> 'blklot' FROM raw_sf_data.development_pipeline ORDER BY row_number"
        ).fetchall()

    assert result.row_count == 3
    assert not result.skipped
    [(source_url, version, archive_key, digest, license_name, row_count, loader)] = manifest
    assert source_url == "https://data.sf.gov/d/6jgi-cpb4"
    assert version == "2026-08-28"
    assert license_name == "Creative Commons 1.0 Universal (Public Domain Dedication)"
    assert (row_count, loader) == (3, "v1")
    archived = (tmp_path / archive_key).read_bytes()
    assert sha256(archived) == digest
    assert (tmp_path / archive_key.replace(".json", ".metadata.json")).exists()
    assert [r[0] for r in rows] == ["3800001", "3800001", "3800002"]


def test_ingest_skips_data_already_loaded(migrated_url: str, tmp_path: Path) -> None:
    source = load_sources(SOURCES_FILE)["affordable_pipeline"]
    with psycopg.connect(migrated_url, autocommit=True) as conn:
        first = ingest(
            "affordable_pipeline", source, FakeFetcher(all_responses()), LocalArchive(tmp_path), conn, RAW_SCHEMA, "v1"
        )
        second = ingest(
            "affordable_pipeline", source, FakeFetcher(all_responses()), LocalArchive(tmp_path), conn, RAW_SCHEMA, "v1"
        )
        loads = conn.execute("SELECT count(*) FROM raw_sf_data.load_manifest").fetchone()

    assert not first.skipped
    assert second.skipped
    assert loads == (1,)


def test_reader_role_can_read_sf_but_not_raw(migrated_url: str) -> None:
    with psycopg.connect(migrated_url, autocommit=True) as conn:
        conn.execute("CREATE TABLE sf_data.probe (x int)")
        raw = conn.execute("SELECT has_schema_privilege('sf_data_reader', 'raw_sf_data', 'USAGE')").fetchone()
        sf = conn.execute("SELECT has_table_privilege('sf_data_reader', 'sf_data.probe', 'SELECT')").fetchone()

    assert raw == (False,)
    assert sf == (True,)


def test_config_declares_the_sources() -> None:
    assert set(load_sources(SOURCES_FILE)) == {
        "development_pipeline",
        "affordable_pipeline",
        "analysis_neighborhoods",
        "slr_66in_100yr_storm",
        "air_pollutant_exposure_zone",
        "sfpuc_100yr_storm",
        "eviction_notices",
        "eviction_report",
    }
