import json
from datetime import date
from pathlib import Path

import pytest

from policyhuis_ingest.source_types import (
    ArcGisLayerSource,
    SocrataSource,
    download,
    load_sources,
    parse_metadata,
    parse_rows,
)
from policyhuis_ingest.testing import FakeFetcher
from tests.fixtures import LAYER, SQUARE, geojson, layer_responses, socrata_metadata, socrata_responses


def test_sources_file_is_validated(tmp_path: Path) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text("zones:\n  kind: arcgis_layer\n  layer_url: https://x/0\n  format: geojson\n")
    assert load_sources(path) == {
        "zones": ArcGisLayerSource(kind="arcgis_layer", layer_url="https://x/0", format="geojson")
    }
    path.write_text("zones:\n  kind: arcgis_layer\n  layer_url: https://x/0\n  format: csv\n")
    with pytest.raises(ValueError):
        load_sources(path)


def test_socrata_metadata_gives_title_publisher_license_and_utc_version_date() -> None:
    source = SocrataSource(kind="socrata", domain="data.example.org", dataset_id="abcd-1234", format="json")
    meta = parse_metadata(source, socrata_metadata("abcd-1234", "Says things.", "2026-08-28", "PDDL"))
    assert meta.title == "Dataset abcd-1234"
    assert meta.publisher == "Test Publisher"
    assert meta.description == "Says things."
    assert meta.license == "PDDL"
    assert meta.source_version == date(2026, 8, 28)
    assert meta.source_url == "https://data.example.org/d/abcd-1234"


def test_socrata_metadata_without_a_license_records_none() -> None:
    source = SocrataSource(kind="socrata", domain="data.example.org", dataset_id="abcd-1234", format="json")
    meta = parse_metadata(source, socrata_metadata("abcd-1234", "", "2020-02-25", None))
    assert meta.license is None
    assert meta.description is None


def test_arcgis_metadata_uses_the_layer_edit_date() -> None:
    source = ArcGisLayerSource(kind="arcgis_layer", layer_url=LAYER, format="geojson")
    meta = parse_metadata(source, layer_responses()[f"{LAYER}?f=json"])
    assert meta.source_version == date(2025, 12, 12)
    assert meta.publisher == "Example Agency"
    assert meta.license is None


def test_socrata_download_fails_when_row_count_does_not_match() -> None:
    responses = socrata_responses(
        "abcd-1234", json.dumps([{"a": "1"}]).encode(), 2, socrata_metadata("abcd-1234", "", "2026-01-01", None)
    )
    source = SocrataSource(kind="socrata", domain="data.example.org", dataset_id="abcd-1234", format="json")
    with pytest.raises(ValueError, match="expected 2 rows, received 1"):
        download(source, FakeFetcher(responses))


def test_geojson_rows_keep_properties_and_geometry_separately() -> None:
    data = geojson([{"type": "Feature", "properties": {"shape_area": 1.0}, "geometry": SQUARE}])
    source = SocrataSource(kind="socrata", domain="data.example.org", dataset_id="zone-0001", format="geojson")
    downloaded = download(
        source,
        FakeFetcher(socrata_responses("zone-0001", data, 1, socrata_metadata("zone-0001", "", "2026-01-01", None))),
    )
    rows = parse_rows(source, downloaded.data)
    assert len(rows) == 1
    assert rows[0].record == {"shape_area": 1.0}
    assert rows[0].geometry is not None
    assert rows[0].geometry["type"] == "MultiPolygon"


def test_socrata_domain_is_a_host_name_not_a_url(tmp_path: Path) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text(
        "x:\n  kind: socrata\n  domain: https://data.example.org\n  dataset_id: abcd-1234\n  format: json\n"
    )
    with pytest.raises(ValueError):
        load_sources(path)
