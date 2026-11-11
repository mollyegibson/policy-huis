import json
from datetime import date
from pathlib import Path

import pytest

from policyhuis_ingest.source_types import (
    ArcGisLayerSource,
    PdfSource,
    SocrataSource,
    download,
    load_sources,
    parse_metadata,
    parse_rows,
    raw_table,
)
from policyhuis_ingest.testing import FakeFetcher, pdf
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


REPORT_URL = "https://media.example.org/documents/report.pdf"
REPORT = PdfSource(
    kind="pdf",
    url=REPORT_URL,
    title="Annual Report",
    publisher="Example Board",
    version_pattern=r"^\s*([A-Z][a-z]+ \d{1,2}, \d{4})\s*$",
    version_format="%B %d, %Y",
    format="pdf",
)


def test_pdf_version_is_the_date_printed_in_the_document() -> None:
    document = pdf([["Example Board", "April 8, 2026"], ["The table"]])
    downloaded = download(REPORT, FakeFetcher({REPORT_URL: document}))
    meta = parse_metadata(REPORT, downloaded.metadata)
    assert downloaded.data == document
    assert downloaded.data_extension == "pdf"
    assert meta.source_version == date(2026, 4, 8)
    assert (meta.title, meta.publisher, meta.license, meta.source_url) == (
        "Annual Report",
        "Example Board",
        None,
        REPORT_URL,
    )


@pytest.mark.parametrize("lines", [["No date here"], ["April 8, 2026", "May 1, 2026"]])
def test_pdf_download_fails_unless_the_version_matches_exactly_once(lines: list[str]) -> None:
    with pytest.raises(ValueError, match="version_pattern matched"):
        download(REPORT, FakeFetcher({REPORT_URL: pdf([lines])}))


UNDATED = REPORT.model_copy(update={"version_from": "pdf_mod_date", "version_pattern": None, "version_format": None})


def test_pdf_version_can_be_its_mod_date_in_its_own_time_zone() -> None:
    document = pdf([["Field definitions, no date"]], mod_date="D:20150503231351-07'00'")
    downloaded = download(UNDATED, FakeFetcher({REPORT_URL: document}))
    assert parse_metadata(UNDATED, downloaded.metadata).source_version == date(2015, 5, 3)


def test_pdf_with_no_mod_date_fails_when_its_version_comes_from_it() -> None:
    with pytest.raises(ValueError, match="no /ModDate"):
        download(UNDATED, FakeFetcher({REPORT_URL: pdf([["Field definitions"]])}))


def test_pdf_source_declares_exactly_one_way_to_its_version() -> None:
    with pytest.raises(ValueError, match="needs version_pattern"):
        PdfSource(kind="pdf", url=REPORT_URL, title="t", publisher="p", format="pdf")
    with pytest.raises(ValueError, match="apply only to a printed version"):
        PdfSource(
            kind="pdf",
            url=REPORT_URL,
            title="t",
            publisher="p",
            format="pdf",
            version_from="pdf_mod_date",
            version_format="%Y",
        )


def test_pdf_rows_are_pages_of_text() -> None:
    rows = parse_rows(REPORT, pdf([["first page"], ["second page"]]))
    assert [(row.record["page"], str(row.record["text"]).strip()) for row in rows] == [
        (1, "first page"),
        (2, "second page"),
    ]
    assert all(row.geometry is None for row in rows)


def test_raw_table_is_the_source_key_unless_a_pdf_names_a_shared_one() -> None:
    assert raw_table("report", REPORT) == "report"
    assert raw_table("rent_ordinance", REPORT.model_copy(update={"raw_table": "document_pages"})) == "document_pages"
    zones = ArcGisLayerSource(kind="arcgis_layer", layer_url=LAYER, format="geojson")
    assert raw_table("zones", zones) == "zones"
