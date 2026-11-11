"""Pages shaped like pypdf's text of the Rent Board's Chapter 37 PDF: pleading-paper line numbers, the repeated
notice, footers, a contents page and section headings, with the wording shortened."""

LINE_NUMBERS = [str(n) for n in range(1, 29)]
NOTICE = [
    "NOTE: This is not an official record of the laws or regulations of the City and County of San Francisco since it",
    "changes to the Rent Ordinance made by published court decisions and state legislation, which the official",
]


def contents_page(sections: list[str]) -> list[str]:
    return [
        *LINE_NUMBERS,
        *NOTICE,
        "CHAPTER 37",
        "TABLE OF CONTENTS",
        "Section Subject",
        *[f"{number} Title of {number}" for number in sections],
        "(Amended June 29, 2026) INTERNET http://www.sf.gov/rentboard",
    ]


def body_page(lines: list[str], footer: str) -> list[str]:
    return [*LINE_NUMBERS, *NOTICE, *lines, footer]


EVICTIONS = body_page(
    [
        "Sec. 37.9 Evictions.",
        "[Amended by Ord. No. 3-26, effective February 8, 2026]",
        "(a)  A landlord shall not endeavor to recover possession of a rental unit unless:",
        "(1)  The tenant:",
        "(A)  Has failed to pay the rent to which the landlord is lawfully entitled",
        "under the oral or written agreement between the tenant and landlord;",
        "(2)  The landlord seeks to recover possession in good faith, without ulterior reasons;",
    ],
    "37.9 \u2013 1",
)

SEVERABILITY = body_page(
    [
        "SEC. 37.15 REPORTING OBLIGATIONS; LICENSING.",
        "(a) Owners shall report the units they own.",
        "Section 37.15A.",
        "(a)  A part of the section with its own lettering.",
    ],
    "37.15 \u2013 1",
)


def pages() -> list[str]:
    return ["\n".join(page) for page in [contents_page(["37.9", "37.15"]), EVICTIONS, SEVERABILITY]]
