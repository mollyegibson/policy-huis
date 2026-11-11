import re

import pytest

from sf_docs_ingest.bla_affordable_housing import contents, passages

HEADER = ["Report to Supervisor Chen", "June 5, 2026", "", "Budget and Legislative Analyst"]


def page(number: int, *lines: str) -> str:
    return "\n".join([*HEADER, str(number), *lines])


CONTENTS = page(
    3,
    "Contents",
    "Executive Summary ........................ 1",
    "1. Introduction ........................... 4",
    "2.      Strategies ......................... 5",
    "1. Fund ................................... 5",
    "2. Create a Municipal Bank for Housing ..... 6",
    "3. Raise Ceilings.......................... 6",
    "Continue Efforts .......................... 6",
    "3. Gaps .................................... 7",
)

PAGES = [
    "\n".join(
        [
            "BUDGET AND LEGISLATIVE ANALYST",
            "Budget and Legislative Analyst",
            "1",
            "Re:  Example",
            "Date:  June 5,2026",
            "Executive Summary",
            "Summary text one.",
        ]
    ),
    page(2, "Summary text two.", "56% 60% 56% 58%", "0%", "2021 2022 2023 2024"),
    CONTENTS,
    page(4, "1. Introduction", "Intro text."),
    page(5, "Intro continues.", "2. Strategies", "Strategy lead.", "1. Fund", "Fund text."),
    page(
        6,
        "Fund continues.",
        "2. Create a Municipal Bank for",
        "Housing",
        "Bank text.",
        "3. Raise Ceilings",
        "Ceiling text.",
        "Continue Efforts",
        "Efforts text.",
    ),
    page(7, "3. Gaps", "Gap text."),
]


def test_contents_are_a_tree_whose_subsections_restart_and_continue_their_numbering() -> None:
    contents_page, entries = contents(PAGES)
    assert contents_page == 3
    assert [(e.provision, e.parent, e.page) for e in entries] == [
        ("summary", None, 1),
        ("1", None, 4),
        ("2", None, 5),
        ("2.1", "2", 5),
        ("2.2", "2", 6),
        ("2.3", "2", 6),
        ("2.continue-efforts", "2", 6),
        ("3", None, 7),
    ]


def test_passages_split_each_section_by_page_without_the_page_furniture() -> None:
    texts = {p.provision: p.text for p in passages(PAGES)}
    assert texts == {
        "summary": "Executive Summary",
        "summary.p1": (
            "BUDGET AND LEGISLATIVE ANALYST\nRe:  Example\nDate:  June 5,2026\nExecutive Summary\nSummary text one."
        ),
        "summary.p2": "Summary text two.",
        "1": "1. Introduction",
        "1.p4": "Intro text.",
        "1.p5": "Intro continues.",
        "2": "2. Strategies",
        "2.p5": "Strategy lead.",
        "2.1": "1. Fund",
        "2.1.p5": "Fund text.",
        "2.1.p6": "Fund continues.",
        "2.2": "2. Create a Municipal Bank for Housing",
        "2.2.p6": "Bank text.",
        "2.3": "3. Raise Ceilings",
        "2.3.p6": "Ceiling text.",
        "2.continue-efforts": "Continue Efforts",
        "2.continue-efforts.p6": "Efforts text.",
        "3": "3. Gaps",
        "3.p7": "Gap text.",
    }


def test_every_passage_carries_its_section_heading_and_a_subsection_page_its_subsection_too() -> None:
    by_provision = {p.provision: p for p in passages(PAGES)}
    page = by_provision["2.2.p6"]
    assert (page.parent_provision, page.heading, page.context) == (
        "2.2",
        "2. Strategies",
        "2. Strategies 2. Create a Municipal Bank for Housing",
    )
    assert by_provision["2.2"].parent_provision == "2"


def test_a_heading_missing_from_its_listed_page_fails() -> None:
    moved = [*PAGES[:6], page(7, "Gap text without its heading.")]
    with pytest.raises(ValueError, match=re.escape("heading '3. Gaps' found 0 times on page 7")):
        passages(moved)


def test_a_contents_entry_out_of_sequence_fails() -> None:
    skipped = [*PAGES[:2], CONTENTS.replace("3. Gaps", "5. Gaps"), *PAGES[3:]]
    with pytest.raises(ValueError, match="fits no level"):
        contents(skipped)
