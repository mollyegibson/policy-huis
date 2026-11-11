"""Passages from the Rent Board's copy of the Rent Ordinance (Administrative Code Chapter 37), as pypdf extracts it."""

import re
from collections.abc import Sequence

from sf_docs_ingest.passages.outline import Passage, split_section

_LINE_NUMBER = re.compile(r"^\d{1,2}$")
_FOOTER = re.compile("^37\\.\\d+[A-Z]? \u2013 \\d+$")
_NOTICE = (
    "NOTE: This is not an official record of the laws or regulations of the City and County of San",
    "changes to the Rent Ordinance made by published court decisions and state legislation",
    "Francisco. It is printed for administrative and public convenience.",
)
_SECTION = re.compile(
    r"^(?:(?:Sec|SEC)\. (?P<number>37\.\d+[A-Z]?)\.? (?P<title>.+)|Section\.? (?P<subsection>37\.\d+[A-Z])\.)$"
)
_CONTENTS_ENTRY = re.compile(r"^(?P<number>37\.\d+[A-Z]?) [A-Z]")


def clean_lines(pages: Sequence[str]) -> list[str]:
    """The document's lines without page furniture: blank lines, the pleading-paper line numbers 1 to 28 down each
    page, the "not an official record" notice repeated on every page, and page footers such as `37.9 - 1`, written
    with an en dash."""
    lines: list[str] = []
    for page in pages:
        for raw in page.split("\n"):
            line = raw.strip()
            if not line or _LINE_NUMBER.match(line) or _FOOTER.match(line) or line.startswith(_NOTICE):
                continue
            lines.append(line)
    return lines


def _contents(lines: Sequence[str]) -> list[str]:
    return [m.group("number") for line in lines if (m := _CONTENTS_ENTRY.match(line))]


def passages(pages: Sequence[str]) -> list[Passage]:
    """Passages for every section, from the first section heading on; the contents page before it is not a passage.

    A section starts at its heading ("Sec. 37.9 Evictions." or "SEC. 37.15 REPORTING OBLIGATIONS; LICENSING."). A
    line holding only "Section 37.14A." starts a numbered part of the section before it, which restarts its
    lettering. Fails when the section headings differ from the sections the contents page lists, so a heading the
    rule misses cannot silently merge two sections.
    """
    lines = clean_lines(pages)
    starts = [i for i, line in enumerate(lines) if _SECTION.match(line)]
    if not starts:
        raise ValueError("no section headings found")
    listed = _contents(lines[: starts[0]])
    headed = [m.group("number") for i in starts if (m := _SECTION.match(lines[i])) and m.group("number")]
    if headed != listed:
        raise ValueError(f"section headings {headed} differ from the contents page's {listed}")

    result: list[Passage] = []
    for n, start in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(lines)
        match = _SECTION.match(lines[start])
        if match is None:
            continue
        number = match.group("number") or match.group("subsection")
        title = (match.group("title") or "").strip().rstrip(".")
        heading = f"Sec. {number} {title}".strip()
        result.extend(split_section(number, heading, lines[start + 1 : end], len(result)))
    return result
