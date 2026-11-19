import gzip
import io
import json
import zipfile
from datetime import date
from pathlib import Path

import pytest

from policyhuis_ingest.source_types import (
    ArcGisLayerSource,
    CbsOdataSource,
    CsvDownloadSource,
    EpOnlineSource,
    HalJsonApiSource,
    PdfSource,
    SocrataSource,
    download,
    load_sources,
    parse_metadata,
    parse_rows,
    raw_table,
)
from policyhuis_ingest.testing import FakeFetcher, marked_pdf, pdf
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


AMSTERDAM_API = "https://api.data.example.org/v1/plannen/woningbouwplannen_openbaar"
PLANNEN = HalJsonApiSource(
    kind="hal_json_api",
    url=AMSTERDAM_API,
    title="Woningbouwplannen Openbaar",
    publisher="Gemeente Amsterdam",
    format="json",
    version_field="peildatum",
    page_size=1,
)


def test_hal_json_api_download_follows_pagination_and_takes_the_latest_version() -> None:
    page_one = json.dumps(
        {
            "_embedded": {
                "woningbouwplannen_openbaar": [{"id": 1, "peildatum": "2026-07-01", "_links": {"self": {"href": "x"}}}]
            },
            "_links": {"next": {"href": f"{AMSTERDAM_API}?_pageSize=1&page=2"}},
        }
    ).encode()
    page_two = json.dumps(
        {
            "_embedded": {"woningbouwplannen_openbaar": [{"id": 2, "peildatum": "2026-04-01"}]},
            "_links": {},
        }
    ).encode()
    downloaded = download(
        PLANNEN,
        FakeFetcher({f"{AMSTERDAM_API}?_pageSize=1&page=1": page_one, f"{AMSTERDAM_API}?_pageSize=1&page=2": page_two}),
    )
    rows = parse_rows(PLANNEN, downloaded.data)
    assert [row.record["id"] for row in rows] == [1, 2]
    assert all("_links" not in row.record for row in rows)
    meta = parse_metadata(PLANNEN, downloaded.metadata)
    assert meta.source_version == date(2026, 7, 1)
    assert (meta.title, meta.publisher, meta.source_url) == (
        "Woningbouwplannen Openbaar",
        "Gemeente Amsterdam",
        AMSTERDAM_API,
    )


LISTINGS = CsvDownloadSource(
    kind="csv_download",
    url="https://data.example.org/amsterdam/2026-09-16/data/listings.csv.gz",
    title="Inside Airbnb Amsterdam listings",
    publisher="Inside Airbnb",
    version_pattern=r"/(\d{4}-\d{2}-\d{2})/",
    version_format="%Y-%m-%d",
    format="csv",
    latitude_field="latitude",
    longitude_field="longitude",
)


def test_csv_download_reads_the_version_from_the_url_and_builds_points() -> None:
    csv_bytes = b"id,latitude,longitude\n1,52.37,4.90\n"
    downloaded = download(LISTINGS, FakeFetcher({LISTINGS.url: gzip.compress(csv_bytes)}))
    assert downloaded.data == csv_bytes
    assert downloaded.data_extension == "csv"
    meta = parse_metadata(LISTINGS, downloaded.metadata)
    assert meta.source_version == date(2026, 9, 16)
    rows = parse_rows(LISTINGS, downloaded.data)
    assert rows[0].record["id"] == "1"
    assert rows[0].geometry == {"type": "Point", "coordinates": [4.9, 52.37]}


def test_csv_download_fails_when_the_url_holds_no_version() -> None:
    source = LISTINGS.model_copy(update={"url": "https://data.example.org/amsterdam/listings.csv"})
    with pytest.raises(ValueError, match="version_pattern matched no date"):
        download(source, FakeFetcher({source.url: b"id\n"}))


def ep_online_zip() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(
            "v20261101_v4_csv.csv",
            "\n".join(
                [
                    "PublicatieDatum;01-11-2026",
                    "LaatstVerwerkteMutatievolgnummer;42",
                    "Registratiedatum;Postcode;Energieklasse",
                    "20261031;1017ND;G",
                    "20261030;1018AB;A",
                ]
            ),
        )
    return buffer.getvalue()


DOWNLOAD_INFO = "https://public.ep-online.example.org/api/v5/Mutatiebestand/DownloadInfo?fileType=csv&xmlVersion=4"
LABELS = EpOnlineSource(
    kind="ep_online",
    url=DOWNLOAD_INFO,
    title="EP-Online energielabels",
    publisher="RVO",
    format="zip",
)
ENVELOPE = json.dumps(
    {
        "bestandsnaam": "v20261101_v4_csv.zip",
        "downloadUrl": "https://www.ep-online.example.org/Download/MutationFile?token=secret",
        "geldigTotEnMet": "2026-11-18T03:26:29.7679056+01:00",
    }
).encode()


def test_ep_online_downloads_the_envelope_then_the_zip_and_never_records_the_token() -> None:
    fetcher = FakeFetcher({DOWNLOAD_INFO: ENVELOPE, "https://www.ep-online.example.org/Download/": ep_online_zip()})
    downloaded = download(LABELS, fetcher, api_key="ep-online-key")
    assert downloaded.data_extension == "zip"
    assert fetcher.headers_sent[DOWNLOAD_INFO] == {"Authorization": "ep-online-key", "accept": "text/plain"}
    meta = parse_metadata(LABELS, downloaded.metadata)
    assert meta.source_version == date(2026, 11, 1)
    assert (meta.title, meta.publisher, meta.source_url) == ("EP-Online energielabels", "RVO", DOWNLOAD_INFO)
    assert meta.license == "EP-Online gebruiksvoorwaarden"
    assert "secret" not in downloaded.metadata.decode()
    assert downloaded.data_url == DOWNLOAD_INFO
    rows = parse_rows(LABELS, downloaded.data)
    assert [row.record["Postcode"] for row in rows] == ["1017ND", "1018AB"]
    assert [row.record["Energieklasse"] for row in rows] == ["G", "A"]


def test_ep_online_needs_an_api_key() -> None:
    with pytest.raises(ValueError, match="needs an EP-Online API key"):
        download(LABELS, FakeFetcher({DOWNLOAD_INFO: ENVELOPE}))


def test_ep_online_fails_when_the_file_name_holds_no_version() -> None:
    envelope = json.dumps({"bestandsnaam": "onleesbaar.zip", "downloadUrl": "https://x/Download"}).encode()
    with pytest.raises(ValueError, match="holds no version date"):
        download(LABELS, FakeFetcher({DOWNLOAD_INFO: envelope}), api_key="k")


REGIONS = CbsOdataSource(
    kind="cbs_odata",
    service="https://opendata.cbs.example.org",
    table="86165NED",
    entity_set="WijkenEnBuurten",
    filter="Municipality eq 'GM0363'",
    title="Kerncijfers wijken en buurten 2025",
    publisher="Centraal Bureau voor de Statistiek",
    version=date(2025, 1, 1),
    format="json",
)
REGIONS_FEED = (
    "https://opendata.cbs.example.org/ODataFeed/OData/86165NED/WijkenEnBuurten"
    "?$filter=Municipality%20eq%20%27GM0363%27&$format=json"
)
REGIONS_FEED_SKIPPED = "https://opendata.cbs.example.org/ODataFeed/OData/86165NED/WijkenEnBuurten?$skip=1"


def test_cbs_odata_download_follows_the_feed_and_keeps_the_filter_as_the_data_url() -> None:
    page_one = json.dumps(
        {
            "value": [{"Key": "GM0363    ", "Title": "Amsterdam"}],
            "odata.nextLink": "/ODataFeed/OData/86165NED/WijkenEnBuurten?$skip=1",
        }
    ).encode()
    page_two = json.dumps({"value": [{"Key": "WK0363AA  ", "Title": "Haarlemmerbuurt"}]}).encode()
    fetcher = FakeFetcher({REGIONS_FEED: page_one, REGIONS_FEED_SKIPPED: page_two})
    downloaded = download(REGIONS, fetcher)
    assert downloaded.data_url == REGIONS_FEED
    assert downloaded.data_extension == "json"
    rows = parse_rows(REGIONS, downloaded.data)
    assert [row.record["Title"] for row in rows] == ["Amsterdam", "Haarlemmerbuurt"]
    assert all(row.geometry is None for row in rows)
    meta = parse_metadata(REGIONS, downloaded.metadata)
    assert meta.source_version == date(2025, 1, 1)
    assert meta.license == "CC BY 4.0"
    assert (meta.title, meta.publisher) == ("Kerncijfers wijken en buurten 2025", "Centraal Bureau voor de Statistiek")
    assert meta.source_url == "https://opendata.cbs.example.org/ODataApi/OData/86165NED"
    assert "Municipality eq 'GM0363'" in downloaded.metadata.decode()


def test_cbs_odata_table_identifier_is_a_statline_table_not_a_url(tmp_path: Path) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text(
        "x:\n  kind: cbs_odata\n  service: https://opendata.cbs.nl\n  table: https://opendata.cbs.nl/86165NED\n"
        '  filter: "1 eq 1"\n  title: t\n  publisher: p\n  version: 2025-01-01\n  format: json\n'
    )
    with pytest.raises(ValueError):
        load_sources(path)


ORDINANCE = REPORT.model_copy(update={"strikethrough": "marked"})


def _marked(line: list[dict[str, object]]) -> str:
    return "".join(f"~{span['text']}~" if span["struck"] else str(span["text"]) for span in line)


def test_marked_pdf_rows_flag_struck_text_but_not_underlined_text() -> None:
    data = marked_pdf(
        [
            [
                [("that ", "plain"), ("are", "struck"), (" ", "plain"), ("is", "underlined"), (" affordable", "plain")],
                [("Section ", "plain"), ("415.4(e)(2)", "struck"), ("415.4(g)(2)", "underlined")],
                [("the ", "plain"), ("whole old", "struck"), (" ", "struck"), ("clause", "struck")],
            ]
        ]
    )
    [row] = parse_rows(ORDINANCE, data)
    lines = row.record["lines"]
    assert isinstance(lines, list)
    assert [_marked(line) for line in lines] == [
        "that ~are~ is affordable",
        "Section ~415.4(e)(2)~415.4(g)(2)",
        "the ~whole old clause~",
    ]
    assert "text" in row.record


def test_a_margin_line_number_is_a_line_of_its_own() -> None:
    data = marked_pdf([[[("first line", "plain")], [("second", "struck")]]], line_numbers=True)
    [row] = parse_rows(ORDINANCE, data)
    lines = row.record["lines"]
    assert isinstance(lines, list)
    assert [_marked(line) for line in lines] == ["1", "first line", "2", "~second~"]


def test_pdf_rows_have_no_marked_lines_unless_the_source_declares_them() -> None:
    [row] = parse_rows(REPORT, marked_pdf([[[("old", "struck")]]]))
    assert "lines" not in row.record
