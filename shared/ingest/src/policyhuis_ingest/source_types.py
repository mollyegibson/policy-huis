import io
import json
import logging
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Annotated, Literal, Protocol

import yaml
from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator
from pypdf import PdfReader


class SocrataSource(BaseModel):
    """A dataset on a Socrata open data portal, such as DataSF."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: Literal["socrata"]
    domain: Annotated[str, StringConstraints(pattern=r"^[a-z0-9.-]+\.[a-z]{2,}$")]
    dataset_id: str
    format: Literal["json", "geojson"]


class ArcGisLayerSource(BaseModel):
    """One layer of an ArcGIS FeatureServer."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: Literal["arcgis_layer"]
    layer_url: str
    format: Literal["geojson"]


class PdfSource(BaseModel):
    """A PDF document, loaded as one row per page of extracted text.

    A PDF's own metadata rarely names it, so `title` and `publisher` are declared, as printed in the document. The
    version is, by default, the date printed in it (`version_from: printed`): `version_pattern` is a regular expression
    with one group capturing that date, which must match exactly once in the text (`^` and `$` match at each line), and
    `version_format` is the group's `strptime` format. A document that prints no date declares
    `version_from: pdf_mod_date` instead: its version is the date of the `/ModDate` in its own info record, in the time
    zone written there, and a document without one fails to load. `raw_table` names the raw table its pages load into
    when several documents share one; each load's document is then its manifest row's `source_key`.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: Literal["pdf"]
    url: str
    title: str
    publisher: str
    version_from: Literal["printed", "pdf_mod_date"] = "printed"
    version_pattern: str | None = None
    version_format: str | None = None
    format: Literal["pdf"]
    raw_table: str | None = None

    @model_validator(mode="after")
    def _one_way_to_the_version(self) -> PdfSource:
        printed = self.version_pattern is not None and self.version_format is not None
        neither = self.version_pattern is None and self.version_format is None
        if self.version_from == "printed" and not printed:
            raise ValueError("a printed version needs version_pattern and version_format")
        if self.version_from == "pdf_mod_date" and not neither:
            raise ValueError("version_pattern and version_format apply only to a printed version")
        return self


type Source = SocrataSource | ArcGisLayerSource | PdfSource


class _SourcesFile(BaseModel):
    sources: dict[str, SocrataSource | ArcGisLayerSource | PdfSource]


def load_sources(path: Path) -> dict[str, Source]:
    """The sources declared in a `sources.yaml` file, keyed by source key."""
    raw = yaml.safe_load(path.read_text())
    return dict(_SourcesFile.model_validate({"sources": raw}).sources)


class Fetcher(Protocol):
    def get(self, url: str) -> bytes: ...


@dataclass(frozen=True)
class SourceMetadata:
    """What the publisher says about one version of a source, read from its archived metadata."""

    title: str
    publisher: str | None
    description: str | None
    license: str | None
    source_version: date
    source_url: str


@dataclass(frozen=True)
class Download:
    data: bytes
    data_extension: str
    metadata: bytes
    data_url: str


def _utc_date(epoch_seconds: float) -> date:
    return datetime.fromtimestamp(epoch_seconds, tz=UTC).date()


def _blank_to_none(value: object) -> str | None:
    return value.strip() or None if isinstance(value, str) else None


def raw_table(source_key: str, source: Source) -> str:
    """The raw table a source loads into: its own key, unless a PDF source names a shared table."""
    return source.raw_table if isinstance(source, PdfSource) and source.raw_table is not None else source_key


def pdf_pages(data: bytes) -> list[str]:
    """The text of each page of a PDF, in page order, as extracted by pypdf."""
    pypdf_logger = logging.getLogger("pypdf")
    level = pypdf_logger.level
    pypdf_logger.setLevel(logging.ERROR)
    try:
        return [page.extract_text() for page in PdfReader(io.BytesIO(data)).pages]
    finally:
        pypdf_logger.setLevel(level)


def _printed_version(source: PdfSource, pattern: str, pages: list[str]) -> str:
    matches = [m.group(1) for page in pages for m in re.finditer(pattern, page, re.MULTILINE)]
    if len(matches) != 1:
        raise ValueError(f"{source.url}: version_pattern matched {len(matches)} times, expected exactly once")
    return matches[0]


def _version_fields(source: PdfSource, reader: PdfReader, data: bytes) -> dict[str, str]:
    """What the version is read from, kept in the archived metadata: the printed date as printed, or the `/ModDate`
    date as an ISO date."""
    if source.version_from == "pdf_mod_date":
        modified = reader.metadata.modification_date if reader.metadata is not None else None
        if modified is None:
            raise ValueError(f"{source.url}: version_from is pdf_mod_date, but the PDF has no /ModDate")
        return {"pdf_mod_date": modified.date().isoformat()}
    if source.version_pattern is None:
        raise ValueError(f"{source.url}: a printed version needs version_pattern")
    return {"printed_version": _printed_version(source, source.version_pattern, pdf_pages(data))}


def download(source: Source, fetcher: Fetcher) -> Download:
    """Fetch a source's full data and its metadata."""
    match source:
        case SocrataSource(domain=domain, dataset_id=dataset_id, format=fmt):
            base = f"https://{domain}/resource/{dataset_id}"
            count = json.loads(fetcher.get(f"{base}.json?$select=count(*)%20as%20n"))[0]["n"]
            data_url = f"{base}.{fmt}?$limit={int(count) + 1}&$order=:id"
            data = fetcher.get(data_url)
            rows = len(json.loads(data)["features"]) if fmt == "geojson" else len(json.loads(data))
            if rows != int(count):
                raise ValueError(f"{dataset_id}: expected {count} rows, received {rows}")
            metadata = fetcher.get(f"https://{domain}/api/views/{dataset_id}.json")
            return Download(data=data, data_extension=fmt, metadata=metadata, data_url=data_url)
        case ArcGisLayerSource(layer_url=layer_url):
            data_url = f"{layer_url}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson"
            data = fetcher.get(data_url)
            metadata = fetcher.get(f"{layer_url}?f=json")
            return Download(data=data, data_extension="geojson", metadata=metadata, data_url=data_url)
        case PdfSource(url=url):
            data = fetcher.get(url)
            reader = PdfReader(io.BytesIO(data))
            metadata = json.dumps(
                {
                    "pdf_info": {str(k): str(v) for k, v in (reader.metadata or {}).items()},
                    **_version_fields(source, reader, data),
                }
            ).encode()
            return Download(data=data, data_extension="pdf", metadata=metadata, data_url=url)


def parse_metadata(source: Source, metadata: bytes) -> SourceMetadata:
    """Read title, publisher, description, license and version from a source's metadata."""
    doc = json.loads(metadata)
    match source:
        case SocrataSource(domain=domain, dataset_id=dataset_id):
            license_info = doc.get("license") or {}
            return SourceMetadata(
                title=doc["name"],
                publisher=_blank_to_none(doc.get("attribution")),
                description=_blank_to_none(doc.get("description")),
                license=_blank_to_none(license_info.get("name")),
                source_version=_utc_date(doc["rowsUpdatedAt"]),
                source_url=f"https://{domain}/d/{dataset_id}",
            )
        case ArcGisLayerSource(layer_url=layer_url):
            return SourceMetadata(
                title=doc["name"],
                publisher=_blank_to_none(doc.get("copyrightText")),
                description=_blank_to_none(doc.get("description")),
                license=None,
                source_version=_utc_date(doc["editingInfo"]["lastEditDate"] / 1000),
                source_url=layer_url,
            )
        case PdfSource(url=url, title=title, publisher=publisher):
            return SourceMetadata(
                title=title,
                publisher=publisher,
                description=None,
                license=None,
                source_version=_pdf_version(source, doc),
                source_url=url,
            )


def _pdf_version(source: PdfSource, doc: dict[str, str]) -> date:
    if source.version_from == "pdf_mod_date":
        return date.fromisoformat(doc["pdf_mod_date"])
    if source.version_format is None:
        raise ValueError(f"{source.url}: a printed version needs version_format")
    return datetime.strptime(doc["printed_version"], source.version_format).date()


@dataclass(frozen=True)
class RawRow:
    record: dict[str, object]
    geometry: dict[str, object] | None


def parse_rows(source: Source, data: bytes) -> list[RawRow]:
    """Split a source's data into rows: properties as the record, and the geometry when the format has one. A PDF
    gives one row per page, with its page number and text."""
    if source.format == "pdf":
        return [RawRow(record={"page": n, "text": text}, geometry=None) for n, text in enumerate(pdf_pages(data), 1)]
    doc = json.loads(data)
    if source.format == "geojson":
        return [RawRow(record=f["properties"], geometry=f["geometry"]) for f in doc["features"]]
    return [RawRow(record=row, geometry=None) for row in doc]
