"""Small synthetic source responses for tests, shaped like DataSF and ArcGIS responses."""

import json
from datetime import UTC, datetime

from policyhuis_ingest.testing import pdf

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


EVICTION_GROUNDS = (
    "non_payment",
    "breach",
    "nuisance",
    "illegal_use",
    "failure_to_sign_renewal",
    "access_denial",
    "unapproved_subtenant",
    "owner_move_in",
    "demolition",
    "capital_improvement",
    "substantial_rehab",
    "ellis_act_withdrawal",
    "condo_conversion",
    "roommate_same_unit",
    "other_cause",
    "late_payments",
    "lead_remediation",
    "development",
    "good_samaritan_ends",
)


def eviction_rows() -> list[dict[str, object]]:
    def row(
        eviction_id: str, file_date: str, grounds: set[str], nhood: str | None, district: str | None
    ) -> dict[str, object]:
        r: dict[str, object] = {
            "eviction_id": eviction_id,
            "address": "0 Block Of Test St",
            "file_date": f"{file_date}T00:00:00.000",
            **{ground: ground in grounds for ground in EVICTION_GROUNDS},
            "shape": {"type": "Point", "coordinates": list(INSIDE)},
            "data_as_of": "2026-11-06T00:00:00.000",
        }
        if nhood:
            r["neighborhood"] = nhood
        if district:
            r["supervisor_district"] = district
        return r

    return [
        row("M000001", "2024-01-15", {"owner_move_in"}, "Mission Bay", "6"),
        row("M000002", "2024-02-03", {"breach", "nuisance"}, "Castro/Upper Market", "8"),
        row("M000003", "2025-07-30", set(), None, None),
    ]


EVICTION_REPORT = "https://media.api.sf.gov/documents/Rent_Board_Annual_Eviction_Report_25-26_2HGK2Cl.pdf"

# Lines from the 2025-26 report's table of reasons and Ordinance sections, as pypdf extracts them.
EVICTION_REPORT_TABLE = [
    "415 *  non-payment of rent 37.9(a)(1)",
    "9      habitual late payment of rent 37.9(a)(1)",
    "331  breach of rental agreement 37.9(a)(2)",
    "405  committing a nuisance 37.9(a)(3)",
    "6  illegal use of rental unit 37.9(a)(4)",
    "2  failure to renew agreement 37.9(a)(5)",
    "12  failure to permit landlord access 37.9(a)(6)",
    "29  unapproved subtenant 37.9(a)(7)",
    "98  owner/relative move-in 37.9(a)(8)",
    "0  condo conversion sale 37.9(a)(9)",
    "0  demolition (single unit) 37.9(a)(10)",
    "93  capital improvement work 37.9(a)(11)",
    "0  substantial rehabilitation  37.9(a)(12)",
    "50  Ellis (withdrawal of unit) 37.9(a)(13)",
    "1   lead remediation  37.9(a)(14)",
    "0   development agreement 37.9(a)(15)",
    "0   Good Samaritan 37.9(a)(16)",
    "0   demolition (redevelopment) 37.9(a)(17)",
    "20  roommate eviction 37.9(b)",
    "17                                                       other or no reason given",
]


def eviction_report() -> bytes:
    return pdf(
        [
            ["Residential Rent Stabilization", "and Arbitration Board", "April 8, 2026", "Angela Calvillo"],
            [
                "Page 2 of the 2025-2026 Rent Board Annual Report on Eviction Notices",
                "Number                Reason                Ordinance Section",
                *EVICTION_REPORT_TABLE,
                "1,488   Total Eviction Notices",
                "*The Rent Ordinance does not require the filing of Non-Payment of rent notices with the department.",
                "Breach of rental agreement 151        331          +119%",
            ],
        ]
    )


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
    responses |= datasf_responses(
        "5cei-gny5",
        eviction_rows(),
        datasf_metadata(
            "5cei-gny5",
            "Eviction Notices",
            "Data includes eviction notices filed with the San Francisco Rent Board.",
            "2026-11-06",
            "Open Data Commons Public Domain Dedication and License",
        ),
    )
    responses |= datasf_responses(
        "hsxb-ci7b",
        [
            {"effective_starting_date": "1982-04-01T00:00:00.000", "annual_allowable_increase": "7.0"},
            {"effective_starting_date": "1992-03-01T00:00:00.000", "annual_allowable_increase": "4.0"},
            {"effective_starting_date": "1992-12-08T00:00:00.000", "annual_allowable_increase": "1.6"},
            {"effective_starting_date": "2026-03-01T00:00:00.000", "annual_allowable_increase": "1.6"},
        ],
        datasf_metadata(
            "hsxb-ci7b",
            "Annual Allowable Rent Increase for Units Under Rent Control",
            "The new rates are effective every year on March 1.",
            "2026-05-01",
            "Open Data Commons Public Domain Dedication and License",
        ),
    )
    responses[EVICTION_REPORT] = eviction_report()
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
