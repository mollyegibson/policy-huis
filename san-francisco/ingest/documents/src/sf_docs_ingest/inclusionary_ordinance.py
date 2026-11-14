"""Passages from the ordinance in Board File No. 260538 (Inclusionary Housing Program Updates and Reductions), as
amended in Board, from the Planning Code sections it restates in their amended form.

The ordinance prints each code section it amends with its deletions struck through and its additions underlined; the
pages it is given here are already its current text (see `amendments.current_text`).
"""

import re
from collections.abc import Sequence

from sf_docs_ingest.passages.outline import Passage, split_section

_LINE_NUMBER = re.compile(r"^\d{1,2}$")
_SPONSORS = "Mayor Lurie; Supervisors "
_FOOTER = re.compile(r"^(?:BOARD OF SUPERVISORS(?: Page \d{1,3})?|Page \d{1,3})$")
_CODE_SECTION = re.compile(r"^SEC\. (?P<number>\d+[A-Z]?(?:\.\d+)?(?:-\d+)?)\. (?P<title>.+)$")
_ORDINANCE_SECTION = re.compile(r"^Section \d+\. ")
_OMISSION = "* * * *"


def clean_lines(pages: Sequence[str]) -> list[str]:
    """The ordinance's lines without page furniture: the pleading-paper line numbers 1 to 28 down each page, the
    sponsors' line and the "BOARD OF SUPERVISORS" and "Page N" footer at the foot of each page."""
    lines: list[str] = []
    for page in pages:
        for raw in page.split("\n"):
            line = raw.strip()
            if not line or _LINE_NUMBER.match(line) or line.startswith(_SPONSORS) or _FOOTER.match(line):
                continue
            lines.append(line)
    return lines


def _in_scope(number: str, sections: Sequence[str]) -> bool:
    return any(number == section or number.startswith(f"{section}.") for section in sections)


def _section_key(number: str) -> tuple[int, ...]:
    return tuple(int(part) for part in re.findall(r"\d+", number))


def passages(pages: Sequence[str], sections: Sequence[str]) -> list[Passage]:
    """Passages for each code section in `sections` (a section and its numbered subsections: "415" covers 415.1 and
    415.10, but not 415A), from its heading to the next heading of a code section or of the ordinance itself.

    A heading ("SEC. 415.3. APPLICATION.") continues on the next lines while they are capitals and it does not yet
    end with a period. A section the ordinance deletes is struck through whole, so it has no heading here and no
    passages. Fails when no section in scope is found, when their headings are out of order or repeated, or when
    one holds an omission ("* * * *"), since a section printed in part would be loaded as if whole.
    """
    lines = clean_lines(pages)
    headings: list[tuple[int, int, str, str]] = []
    for i, line in enumerate(lines):
        match = _CODE_SECTION.match(line)
        if match is None:
            continue
        title, end = match.group("title"), i + 1
        while not title.endswith(".") and end < len(lines) and lines[end].isupper():
            title, end = f"{title} {lines[end]}", end + 1
        headings.append((i, end, match.group("number"), title.rstrip(".")))
    bounds = sorted([i for i, *_ in headings] + [i for i, line in enumerate(lines) if _ORDINANCE_SECTION.match(line)])

    chosen = [h for h in headings if _in_scope(h[2], sections)]
    if not chosen:
        raise ValueError(f"no heading of sections {list(sections)} found")
    numbers = [number for _, _, number, _ in chosen]
    if [_section_key(n) for n in numbers] != sorted({_section_key(n) for n in numbers}):
        raise ValueError(f"section headings {numbers} are out of order or repeated")

    result: list[Passage] = []
    for start, body, number, title in chosen:
        end = next((b for b in bounds if b > start), len(lines))
        text = lines[body:end]
        if _OMISSION in text:
            raise ValueError(f"Sec. {number} omits part of its text ({_OMISSION})")
        result.extend(split_section(number, f"Sec. {number} {title}", text, len(result)))
    return result
