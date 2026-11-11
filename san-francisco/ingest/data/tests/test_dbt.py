from pathlib import Path

import psycopg
import pytest
from policyhuis_ingest.archive import LocalArchive
from policyhuis_ingest.dbt import run_dbt
from policyhuis_ingest.load import ingest
from policyhuis_ingest.source_types import load_sources
from policyhuis_ingest.testing import FakeFetcher

from sf_data_ingest.settings import DBT_PROJECT, RAW_SCHEMA, SOURCES_FILE
from tests.fixtures import all_responses


@pytest.fixture
def built_url(migrated_url: str, tmp_path: Path) -> str:
    """Every source loaded from the synthetic responses, then `dbt build` run."""
    fetcher = FakeFetcher(all_responses())
    with psycopg.connect(migrated_url, autocommit=True) as conn:
        for key, source in load_sources(SOURCES_FILE).items():
            ingest(key, source, fetcher, LocalArchive(tmp_path), conn, RAW_SCHEMA, "v1")
    assert run_dbt(DBT_PROJECT, migrated_url, ["build"]) == 0
    return migrated_url


def test_development_pipeline_keeps_parcels_with_several_projects(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT snapshot, project_key, status FROM sf_data.development_pipeline ORDER BY project_key"
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
            "FROM sf_data.development_pipeline AS d JOIN raw_sf_data.load_manifest AS m ON m.load_id = d.load_id"
        ).fetchall()

    assert rows == [("2026 Q2", True)]


def test_ami_units_unpivot_drops_empty_bands(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT ami_band, units FROM sf_data.affordable_pipeline_ami_units "
            "WHERE project_id = '2024-001' ORDER BY ami_band"
        ).fetchall()

    assert rows == [("_50_ami", 60), ("_80_ami", 39)]


def test_zones_take_name_publisher_and_date_from_metadata(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute("SELECT zone, name, source_edited_at::text FROM sf_data.zones ORDER BY zone").fetchall()

    assert rows == [
        ("air_pollutant_exposure_zone", "Air Pollutant Exposure Zone", "2025-03-19"),
        ("sfpuc_100yr_storm", "100-Year Storm Flood Risk Zone", "2025-12-12"),
        ("slr_66in_100yr_storm", "100-year storm + 66 inches Sea Level Rise", "2020-02-25"),
    ]


def test_exposure_includes_projects_inside_a_zone_and_excludes_others(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT DISTINCT project_source, project_id FROM sf_data.project_zone_exposure ORDER BY 1, 2"
        ).fetchall()

    assert rows == [
        ("affordable_pipeline", "2024-001"),
        ("development_pipeline", "3800001:2019-000001PRJ:202401010001"),
    ]


def test_pipeline_neighborhood_names_use_the_official_separator(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        names = conn.execute("SELECT DISTINCT neighborhood FROM sf_data.development_pipeline ORDER BY 1").fetchall()

    assert names == [("Castro/Upper Market",), ("Mission Bay",)]


def test_eviction_grounds_take_reason_and_section_from_the_report(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = dict(
            (key, (label, section))
            for key, label, section in conn.execute(
                "SELECT ground_key, label, section FROM sf_data.eviction_grounds"
            ).fetchall()
        )

    assert len(rows) == 19
    assert rows["owner_move_in"] == ("owner/relative move-in", "37.9(a)(8)")
    assert rows["late_payments"] == ("habitual late payment of rent", "37.9(a)(1)")
    assert rows["substantial_rehab"] == ("substantial rehabilitation", "37.9(a)(12)")
    assert rows["roommate_same_unit"] == ("roommate eviction", "37.9(b)")
    assert rows["other_cause"] == ("other or no reason given", None)


def test_eviction_report_table_stops_at_its_total(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        reasons = [r[0] for r in conn.execute("SELECT reason FROM sf_data.eviction_report_grounds").fetchall()]

    assert len(reasons) == 20
    assert "demolition (redevelopment)" in reasons
    assert not any("Total" in reason or "Breach" in reason for reason in reasons)


def test_eviction_notice_grounds_hold_one_row_per_ground_given(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT eviction_id, ground_key FROM sf_data.eviction_notice_grounds ORDER BY eviction_id, ground_key"
        ).fetchall()
        notices = conn.execute(
            "SELECT eviction_id, file_month::text, neighborhood, supervisor_district, geom IS NOT NULL "
            "FROM sf_data.eviction_notices ORDER BY eviction_id"
        ).fetchall()

    assert rows == [("M000001", "owner_move_in"), ("M000002", "breach"), ("M000002", "nuisance")]
    assert notices == [
        ("M000001", "2024-01-01", "Mission Bay", 6, True),
        ("M000002", "2024-02-01", "Castro/Upper Market", 8, True),
        ("M000003", "2025-07-01", None, None, True),
    ]


def test_eviction_report_is_listed_with_its_printed_date(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        row = conn.execute(
            "SELECT title, publisher, source_version::text, license FROM sf_data.datasets "
            "WHERE dataset_key = 'eviction_report'"
        ).fetchone()

    assert row == (
        "2025-2026 Rent Board Annual Report on Eviction Notices",
        "San Francisco Residential Rent Stabilization and Arbitration Board",
        "2026-04-08",
        None,
    )


def test_allowable_rent_increase_periods_run_to_the_next_one(built_url: str) -> None:
    with psycopg.connect(built_url) as conn:
        rows = conn.execute(
            "SELECT effective_from::text, effective_to::text, percent::text "
            "FROM sf_data.allowable_rent_increases ORDER BY effective_from"
        ).fetchall()

    assert rows == [
        ("1982-04-01", "1992-02-29", "7.0"),
        ("1992-03-01", "1992-12-07", "4.0"),
        ("1992-12-08", "2026-02-28", "1.6"),
        ("2026-03-01", "2027-02-28", "1.6"),
    ]
