import pytest

from sf_docs_ingest.rent_ordinance import clean_lines, passages
from tests.fixtures import EVICTIONS, contents_page, pages


def test_page_furniture_is_removed() -> None:
    lines = clean_lines(["\n".join(EVICTIONS)])
    assert lines[0] == "Sec. 37.9 Evictions."
    assert not any(line.isdigit() or line.startswith(("NOTE:", "changes to the Rent")) for line in lines)
    assert not any("\u2013" in line for line in lines)


def test_sections_start_at_their_headings_and_skip_the_contents_page() -> None:
    by_provision = {p.provision: p for p in passages(pages())}
    assert list(by_provision) == [
        "37.9",
        "37.9(a)",
        "37.9(a)(1)",
        "37.9(a)(1)(A)",
        "37.9(a)(2)",
        "37.15(a)",
        "37.15A(a)",
    ]
    assert by_provision["37.9"].text == "[Amended by Ord. No. 3-26, effective February 8, 2026]"
    assert by_provision["37.9(a)(1)(A)"].text == (
        "(A) Has failed to pay the rent to which the landlord is lawfully entitled "
        "under the oral or written agreement between the tenant and landlord;"
    )
    assert by_provision["37.9(a)(2)"].context == (
        "Sec. 37.9 Evictions (a) A landlord shall not endeavor to recover possession of a rental unit unless:"
    )
    assert by_provision["37.15(a)"].heading == "Sec. 37.15 REPORTING OBLIGATIONS; LICENSING"
    assert by_provision["37.15A(a)"].heading == "Sec. 37.15A"


def test_a_heading_missing_from_the_body_fails() -> None:
    document = ["\n".join(contents_page(["37.9", "37.10A", "37.15"])), *pages()[1:]]
    with pytest.raises(ValueError, match="differ from the contents page"):
        passages(document)
