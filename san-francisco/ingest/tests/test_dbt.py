from pathlib import Path

import psycopg
import pytest
from policyhuis_ingest.archive import LocalArchive
from policyhuis_ingest.dbt import run_dbt
from policyhuis_ingest.load import ingest
from policyhuis_ingest.source_types import load_sources
from policyhuis_ingest.testing import FakeFetcher

from sf_ingest.settings import DBT_PROJECT, RAW_SCHEMA, SOURCES_FILE
from tests.fixtures import all_responses


@pytest.fixture
def built_url(migrated_url: str, tmp_path: Path) -> str:
    """Every Phase 1 source loaded from the synthetic responses, then `dbt build` run."""
    fetcher = FakeFetcher(all_responses())
    with psycopg.connect(migrated_url, autocommit=True) as conn:
        for key, source in load_sources(SOURCES_FILE).items():
            ingest(key, source, fetcher, LocalArchive(tmp_path), conn, RAW_SCHEMA, "v1")
    assert run_dbt(DBT_PROJECT, migrated_url, ["build"]) == 0
    return migrated_url


def test_development_pipeline_keeps_parcels_with_several_projects(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT snapshot, project_key, status FROM sf.development_pipeline ORDER BY project_key"
        ).fetchall()

    assert rows == [
        ("2026 Q2", "3800001:2019-000001PRJ:202401010001", "PL Approved"),
        ("2026 Q2", "3800001:2019-000002PRJ:202401010001", "BP Issued"),
        ("2026 Q2", "3800002:2020-000003PRJ:202401010001", "Construction"),
    ]


def test_development_pipeline_carries_its_snapshot_source_version(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT DISTINCT d.snapshot, d.source_version = m.source_version "
            "FROM sf.development_pipeline AS d JOIN raw_sf.load_manifest AS m ON m.load_id = d.load_id"
        ).fetchall()

    assert rows == [("2026 Q2", True)]


def test_ami_units_unpivot_drops_empty_bands(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT ami_band, units FROM sf.affordable_pipeline_ami_units "
            "WHERE project_id = '2024-001' ORDER BY ami_band"
        ).fetchall()

    assert rows == [("_50_ami", 60), ("_80_ami", 39)]


def test_zones_take_name_publisher_and_date_from_metadata(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute("SELECT zone, name, source_edited_at::text FROM sf.zones ORDER BY zone").fetchall()

    assert rows == [
        ("air_pollutant_exposure_zone", "Air Pollutant Exposure Zone", "2025-03-19"),
        ("sfpuc_100yr_storm", "100-Year Storm Flood Risk Zone", "2025-12-12"),
        ("slr_66in_100yr_storm", "100-year storm + 66 inches Sea Level Rise", "2020-02-25"),
    ]


def test_exposure_includes_projects_inside_a_zone_and_excludes_others(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT DISTINCT project_source, project_id FROM sf.project_zone_exposure ORDER BY 1, 2"
        ).fetchall()

    assert rows == [
        ("affordable_pipeline", "2024-001"),
        ("development_pipeline", "3800001:2019-000001PRJ:202401010001"),
    ]


def test_pipeline_neighborhood_names_use_the_official_separator(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        names = conn.execute("SELECT DISTINCT neighborhood FROM sf.development_pipeline ORDER BY 1").fetchall()

    assert names == [("Castro/Upper Market",), ("Mission Bay",)]
