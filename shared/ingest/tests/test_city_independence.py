from pathlib import Path

import policyhuis_ingest

SHARED_FILES = [
    *Path(policyhuis_ingest.__file__).parent.glob("*.py"),
    *(Path(__file__).resolve().parents[1] / "dbt").rglob("*.sql"),
]


def test_shared_code_names_no_city() -> None:
    """City-specific values (portals, schemas, place names) belong in each city's project, never here."""
    for path in SHARED_FILES:
        text = path.read_text().lower()
        for marker in ("sf.gov", "sfgov", "raw_sf", "san francisco", "sfpuc", "raw_nl", "amsterdam"):
            assert marker not in text, f"{path.name} mentions {marker!r}"
