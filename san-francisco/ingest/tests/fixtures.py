"""Small synthetic source responses for tests, shaped like DataSF and ArcGIS responses."""

import json
from datetime import UTC, datetime

DATASF = "https://data.sf.gov"
SFPUC_LAYER = (
    "https://gis.sfpuc.org/server/rest/services/Hosted/100_Year_Storm_Flood_Risk_Map_2024_Update/FeatureServer/2"
)

# A unit square near Mission Bay, and points inside and outside it.
ZONE = {
    "type": "MultiPolygon",
    "coordinates": [[[[-122.40, 37.77], [-122.39, 37.77], [-122.39, 37.78], [-122.40, 37.78], [-122.40, 37.77]]]],
}
INSIDE = (-122.395, 37.775)
OUTSIDE = (-122.45, 37.75)


def epoch(day: str) -> int:
    return int(datetime.fromisoformat(day).replace(tzinfo=UTC).timestamp())


def datasf_metadata(dataset_id: str, name: str, description: str, updated: str, license_name: str | None) -> bytes:
    doc: dict[str, object] = {
        "id": dataset_id,
        "name": name,
        "attribution": "Test Publisher",
        "description": description,
        "rowsUpdatedAt": epoch(updated),
    }
    if license_name:
        doc["license"] = {"name": license_name}
    return json.dumps(doc).encode()


def development_rows() -> list[dict[str, object]]:
    def row(
        blklot: str, case_no: str, status: str, point: tuple[float, float] | None, nhood: str = "Mission Bay"
    ) -> dict[str, object]:
        r: dict[str, object] = {
            "blklot": blklot,
            "case_no": case_no,
            "bpa_no": "202401010001",
            "nameaddr": f"{blklot} Test St",
            "current_status": status,
            "current_status_date": "2024-03-01T00:00:00.000",
            "approved_date_planning": "2019-06-12T00:00:00.000",
            "net_pipeline_units": "40",
            "pipeline_affordable_units": "8",
            "bmr_units_ex_low": "0",
            "bmr_units_very_low": "4",
            "bmr_units_low": "4",
            "bmr_units_moderate": "0",
            "nhood41": nhood,
            "sd22": "6",
        }
        if point:
            r["longitude"], r["latitude"] = str(point[0]), str(point[1])
        return r

    return [
        row("3800001", "2019-000001PRJ", "PL Approved", INSIDE),
        row("3800001", "2019-000002PRJ", "BP BP Issued", OUTSIDE, "Castro - Upper Market"),
        row("3800002", "2020-000003PRJ", "Construction", None),
    ]


def affordable_rows() -> list[dict[str, object]]:
    def row(project_id: str, point: tuple[float, float]) -> dict[str, object]:
        return {
            "project_id": project_id,
            "project_name": f"Project {project_id}",
            "project_status": "Pre-Construction",
            "construction_status": "(3) Design with Entitlements Approved",
            "city_analysis_neighborhood": "Mission Bay",
            "supervisor_district": "6",
            "total_project_units": "100",
            "mohcd_affordable_units": "99",
            "_50_ami": "60",
            "_80_ami": "39",
            "_20_ami": "0",
            "ami_undeclared": "0",
            "estimated_actual_construction_start_date": "2027-01-15T00:00:00.000",
            "longitude": str(point[0]),
            "latitude": str(point[1]),
        }

    return [row("2024-001", INSIDE), row("2024-002", OUTSIDE)]


def geojson(features: list[dict[str, object]]) -> bytes:
    return json.dumps({"type": "FeatureCollection", "features": features}).encode()


def datasf_responses(dataset_id: str, rows: list[dict[str, object]] | bytes, metadata: bytes) -> dict[str, bytes]:
    data = rows if isinstance(rows, bytes) else json.dumps(rows).encode()
    count = len(json.loads(data)["features"]) if isinstance(rows, bytes) else len(rows)
    return {
        f"{DATASF}/resource/{dataset_id}.json?$select=count": json.dumps([{"n": str(count)}]).encode(),
        f"{DATASF}/resource/{dataset_id}.": data,
        f"{DATASF}/api/views/{dataset_id}.json": metadata,
    }


def all_responses() -> dict[str, bytes]:
    zone_feature = [{"type": "Feature", "properties": {"shape_area": 1.0}, "geometry": ZONE}]
    responses: dict[str, bytes] = {}
    responses |= datasf_responses(
        "6jgi-cpb4",
        development_rows(),
        datasf_metadata(
            "6jgi-cpb4",
            "San Francisco Development Pipeline",
            "A. SUMMARY Snapshot of San Francisco's Development Pipeline as of the end of 2026 Q2.",
            "2026-08-28",
            "Creative Commons 1.0 Universal (Public Domain Dedication)",
        ),
    )
    responses |= datasf_responses(
        "aaxw-2cb8",
        affordable_rows(),
        datasf_metadata("aaxw-2cb8", "Affordable Housing Pipeline", "Snapshot.", "2026-05-21", "PDDL"),
    )
    responses |= datasf_responses(
        "j2bu-swwd",
        [{"nhood": "Mission Bay"}, {"nhood": "Castro/Upper Market"}],
        datasf_metadata("j2bu-swwd", "Analysis Neighborhoods", "Neighborhoods.", "2023-10-17", "PDDL"),
    )
    responses |= datasf_responses(
        "6ann-usi8",
        geojson(zone_feature),
        datasf_metadata("6ann-usi8", "100-year storm + 66 inches Sea Level Rise", "SLR.", "2020-02-25", None),
    )
    responses |= datasf_responses(
        "t65d-x6p8",
        geojson(zone_feature),
        datasf_metadata("t65d-x6p8", "Air Pollutant Exposure Zone", "APEZ.", "2025-03-19", "Public Domain"),
    )
    responses[f"{SFPUC_LAYER}/query"] = geojson(zone_feature)
    responses[f"{SFPUC_LAYER}?f=json"] = json.dumps(
        {
            "name": "100-Year Storm Flood Risk Zone",
            "description": "Stormwater flooding.",
            "copyrightText": "San Francisco Public Utilities Commission (SFPUC).",
            "editingInfo": {"lastEditDate": epoch("2025-12-12") * 1000},
        }
    ).encode()
    return responses
