"""Small synthetic responses shaped like Socrata and ArcGIS layer responses."""

import json
from datetime import UTC, datetime

PORTAL = "data.example.org"
LAYER = "https://gis.example.org/server/rest/services/Hosted/Zones/FeatureServer/0"
SQUARE = {
    "type": "MultiPolygon",
    "coordinates": [[[[-122.40, 37.77], [-122.39, 37.77], [-122.39, 37.78], [-122.40, 37.78], [-122.40, 37.77]]]],
}


def epoch(day: str) -> int:
    return int(datetime.fromisoformat(day).replace(tzinfo=UTC).timestamp())


def socrata_metadata(dataset_id: str, description: str, updated: str, license_name: str | None) -> bytes:
    doc: dict[str, object] = {
        "id": dataset_id,
        "name": f"Dataset {dataset_id}",
        "attribution": "Test Publisher",
        "description": description,
        "rowsUpdatedAt": epoch(updated),
    }
    if license_name:
        doc["license"] = {"name": license_name}
    return json.dumps(doc).encode()


def geojson(features: list[dict[str, object]]) -> bytes:
    return json.dumps({"type": "FeatureCollection", "features": features}).encode()


def socrata_responses(dataset_id: str, data: bytes, count: int, metadata: bytes) -> dict[str, bytes]:
    return {
        f"https://{PORTAL}/resource/{dataset_id}.json?$select=count": json.dumps([{"n": str(count)}]).encode(),
        f"https://{PORTAL}/resource/{dataset_id}.": data,
        f"https://{PORTAL}/api/views/{dataset_id}.json": metadata,
    }


def rows_responses() -> dict[str, bytes]:
    rows = [{"name": "a", "units": "4"}, {"name": "b", "units": "0"}]
    meta = socrata_metadata("rows-0001", "Rows.", "2026-08-28", "PDDL")
    return socrata_responses("rows-0001", json.dumps(rows).encode(), len(rows), meta)


def layer_responses() -> dict[str, bytes]:
    return {
        f"{LAYER}/query": geojson([{"type": "Feature", "properties": {"objectid": 1}, "geometry": SQUARE}]),
        f"{LAYER}?f=json": json.dumps(
            {
                "name": "Zones",
                "description": "A zone.",
                "copyrightText": "Example Agency",
                "editingInfo": {"lastEditDate": epoch("2025-12-12") * 1000},
            }
        ).encode(),
    }
