import pytest

from sf_docs_ingest.inclusionary_ordinance import clean_lines, passages

SPONSORS = "Mayor Lurie; Supervisors Melgar, Dorsey"


def page(number: int, lines: list[str]) -> str:
    """A page as the ordinance prints it: a line number before each line, then the sponsors and the footer."""
    numbered = [part for n, line in enumerate(lines, 1) for part in (str(n), line)]
    return "\n".join([*numbered, SPONSORS, "BOARD OF SUPERVISORS", f"Page {number}"])


ORDINANCE = [
    page(
        22,
        [
            "Section 4. Article 4 of the Planning Code is hereby amended by revising Sections",
            "SEC. 414A.6. OPTION TO PROVIDE SMALL FAMILY CHILD CARE HOME IN LIEU",
            "OF FEE.",
            "(a) Election to Provide Designated Child Care Units.",
            "SEC. 415. HOUSING REQUIREMENTS FOR RESIDENTIAL AND LIVE/WORK",
            "DEVELOPMENT PROJECTS.",
            "Sections 415.1 through 415.11 set forth the requirements.",
            "SEC. 415.3. APPLICATION.",
            "(a) Section 415.1 et seq. shall apply to any housing project that consists of 25 or more",
            "units.",
        ],
    ),
    page(
        23,
        [
            "(b) Section 415.1 et seq. shall not apply to:",
            "(1) That portion of a housing project located on federal property.",
            "SEC. 415.10. TRIENNIAL ECONOMIC FEASIBILITY ANALYSIS; REPORTING TO",
            "BOARD OF SUPERVISORS.",
            "(a) The Controller shall prepare a study.",
            "SEC. 416. MARKET AND OCTAVIA AREA PLAN AND UPPER MARKET",
            "(a) Not in scope.",
            "Section 5. Articles 2, 2.5, 3, and 7 of the Planning Code are amended.",
        ],
    ),
]


def test_page_furniture_is_removed() -> None:
    lines = clean_lines(ORDINANCE)
    assert lines[0].startswith("Section 4.")
    assert not any(line.isdigit() or line.startswith((SPONSORS, "Page ")) for line in lines)
    assert "BOARD OF SUPERVISORS" not in lines
    assert "BOARD OF SUPERVISORS." in lines


def test_passages_are_the_sections_in_scope_from_heading_to_the_next_heading() -> None:
    by_provision = {p.provision: p for p in passages(ORDINANCE, ["415"])}
    assert list(by_provision) == ["415", "415.3(a)", "415.3(b)", "415.3(b)(1)", "415.10(a)"]
    assert (
        by_provision["415"].heading
        == "Sec. 415 HOUSING REQUIREMENTS FOR RESIDENTIAL AND LIVE/WORK DEVELOPMENT PROJECTS"
    )
    assert by_provision["415.3(a)"].text == (
        "(a) Section 415.1 et seq. shall apply to any housing project that consists of 25 or more units."
    )
    assert by_provision["415.3(b)(1)"].context == (
        "Sec. 415.3 APPLICATION (b) Section 415.1 et seq. shall not apply to:"
    )
    assert by_provision["415.10(a)"].heading == (
        "Sec. 415.10 TRIENNIAL ECONOMIC FEASIBILITY ANALYSIS; REPORTING TO BOARD OF SUPERVISORS"
    )


def test_a_section_with_an_omission_fails() -> None:
    omitted = [page(1, ["SEC. 415.3. APPLICATION.", "(a) Applies.", "* * * *", "(d) Later."])]
    with pytest.raises(ValueError, match="omits part of its text"):
        passages(omitted, ["415"])


def test_no_section_in_scope_fails() -> None:
    with pytest.raises(ValueError, match="no heading of sections"):
        passages(ORDINANCE, ["419"])


def test_headings_out_of_order_fail() -> None:
    shuffled = [page(1, ["SEC. 415.5. FEE.", "(a) Paid.", "SEC. 415.3. APPLICATION.", "(a) Applies."])]
    with pytest.raises(ValueError, match="out of order or repeated"):
        passages(shuffled, ["415"])
