from pathlib import Path

import psycopg

from policyhuis_ingest.archive import LocalArchive, sha256
from policyhuis_ingest.load import ingest
from policyhuis_ingest.source_types import ArcGisLayerSource, SocrataSource
from policyhuis_ingest.testing import FakeFetcher
from tests.fixtures import LAYER, layer_responses, rows_responses

ROWS = SocrataSource(kind="socrata", domain="data.example.org", dataset_id="rows-0001", format="json")
ZONES = ArcGisLayerSource(kind="arcgis_layer", layer_url=LAYER, format="geojson")


def test_ingest_archives_then_loads_manifest_and_rows(raw_schema_url: str, tmp_path: Path) -> None:
    with psycopg.connect(raw_schema_url, autocommit=True) as conn:
        result = ingest("rows", ROWS, FakeFetcher(rows_responses()), LocalArchive(tmp_path), conn, "raw_test", "v1")
        manifest = conn.execute(
            "SELECT source_url, source_version::text, archive_key, archive_sha256, license, row_count, loader_version "
            "FROM raw_test.load_manifest"
        ).fetchall()
        rows = conn.execute("SELECT record ->> 'name' FROM raw_test.rows ORDER BY row_number").fetchall()

    assert (result.row_count, result.skipped) == (2, False)
    [(source_url, version, archive_key, digest, license_name, row_count, loader)] = manifest
    assert source_url == "https://data.example.org/d/rows-0001"
    assert version == "2026-08-28"
    assert license_name == "PDDL"
    assert (row_count, loader) == (2, "v1")
    assert archive_key.startswith("raw_test/rows/2026-08-28/")
    assert sha256((tmp_path / archive_key).read_bytes()) == digest
    assert (tmp_path / archive_key.replace(".json", ".metadata.json")).exists()
    assert [r[0] for r in rows] == ["a", "b"]


def test_ingest_skips_data_already_loaded(raw_schema_url: str, tmp_path: Path) -> None:
    with psycopg.connect(raw_schema_url, autocommit=True) as conn:
        first = ingest("rows", ROWS, FakeFetcher(rows_responses()), LocalArchive(tmp_path), conn, "raw_test", "v1")
        second = ingest("rows", ROWS, FakeFetcher(rows_responses()), LocalArchive(tmp_path), conn, "raw_test", "v1")
        loads = conn.execute("SELECT count(*) FROM raw_test.load_manifest").fetchone()

    assert (first.skipped, second.skipped, loads) == (False, True, (1,))


def test_geojson_sources_load_geometry_in_wgs84(raw_schema_url: str, tmp_path: Path) -> None:
    with psycopg.connect(raw_schema_url, autocommit=True) as conn:
        ingest("zones", ZONES, FakeFetcher(layer_responses()), LocalArchive(tmp_path), conn, "raw_test", "v1")
        geometry = conn.execute("SELECT GeometryType(geom), ST_SRID(geom) FROM raw_test.zones").fetchone()

    assert geometry == ("MULTIPOLYGON", 4326)
