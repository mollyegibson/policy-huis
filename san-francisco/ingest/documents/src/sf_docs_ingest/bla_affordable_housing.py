"""Passages from the Budget and Legislative Analyst's policy analysis report "Funding and Incentivizing Affordable
Housing in San Francisco" (June 5, 2026), as pypdf extracts it."""

import re
from collections.abc import Sequence
from dataclasses import dataclass

from sf_docs_ingest.passages.outline import Passage

_RUNNING_HEADER = frozenset({"Report to Supervisor Chen", "Budget and Legislative Analyst"})
_HEADER_DATE = re.compile(r"^[A-Z][a-z]+ \d{1,2}, ?\d{4}$")
_PAGE_NUMBER = re.compile(r"^\d{1,3}$")
_HAS_LETTER = re.compile(r"[A-Za-z]")
_CONTENTS_ENTRY = re.compile(r"^(?P<title>.+?)\s*\.{3,}\s*(?P<page>\d{1,3})$")
_NUMBERED = re.compile(r"^(?P<number>\d{1,2})\.\s+(?P<title>.+)$")


@dataclass(frozen=True)
class Entry:
    """One heading the contents page lists: its provision ID, heading as listed, parent, and page."""

    provision: str
    heading: str
    parent: str | None
    page: int


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def contents(pages: Sequence[str]) -> tuple[int, list[Entry]]:
    """The contents page's number and its entries, as a tree.

    The Executive Summary and the numbered sections are top level. A numbered entry that restarts at 1 begins the
    current section's subsections, which continue in sequence; an unnumbered entry after them is a subsection too, and
    a numbered entry that does not continue the sequence is the next section. Fails unless exactly one page lists
    entries with dot leaders and page numbers.
    """
    found = [
        (n, entries)
        for n, page in enumerate(pages, 1)
        if (entries := [m for line in page.split("\n") if (m := _CONTENTS_ENTRY.match(_normalize(line)))])
    ]
    if len(found) != 1:
        raise ValueError(f"expected one contents page, found {len(found)}")
    contents_page, matches = found[0]
    result: list[Entry] = []
    top: str | None = None
    top_number = 0
    child_number: int | None = None
    for match in matches:
        title, page = _normalize(match.group("title")), int(match.group("page"))
        numbered = _NUMBERED.match(title)
        number = int(numbered.group("number")) if numbered else None
        if top is None:
            if title != "Executive Summary":
                raise ValueError(f"the contents page starts with {title!r}, not the Executive Summary")
            result.append(Entry("summary", title, None, page))
            top = "summary"
        elif number == top_number + 1 and (child_number is None or number != child_number + 1):
            top, top_number, child_number = str(number), number, None
            result.append(Entry(top, title, None, page))
        elif number is not None and (number == 1 if child_number is None else number == child_number + 1):
            child_number = number
            result.append(Entry(f"{top}.{number}", title, top, page))
        elif number is None and child_number is not None:
            result.append(Entry(f"{top}.{_slug(title)}", title, top, page))
        else:
            raise ValueError(f"contents entry {title!r} fits no level")
    return contents_page, result


def _lines(page: str) -> list[str]:
    """A page's lines without page furniture: the running header (addressee, date, office and page number), blank
    lines, and lines with no letters, which are chart labels such as "56% 60% 56% 58%". Footnotes stay."""
    kept: list[str] = []
    for raw in page.split("\n"):
        line = raw.strip()
        if not line or line in _RUNNING_HEADER or _HEADER_DATE.match(line) or not _HAS_LETTER.search(line):
            continue
        kept.append(line)
    return kept


def _heading_at(lines: Sequence[str], entry: Entry) -> tuple[int, int]:
    """Where `entry`'s heading is on its page, and how many lines it takes: the one line that is the listed heading,
    or the start of it when the heading wraps, with the next line when that completes it. Fails unless exactly one
    line matches."""
    listed = _normalize(entry.heading)
    hits = [
        i
        for i, line in enumerate(lines)
        if (text := _normalize(line)) == listed or (len(text.split()) >= 4 and listed.startswith(text))
    ]
    if len(hits) != 1:
        raise ValueError(f"heading {entry.heading!r} found {len(hits)} times on page {entry.page}")
    i = hits[0]
    wrapped = i + 1 < len(lines) and _normalize(f"{lines[i]} {lines[i + 1]}") == listed
    return i, 2 if wrapped else 1


def passages(pages: Sequence[str]) -> list[Passage]:
    """One passage per section and subsection the contents page lists, and one per page of each, from where its
    heading starts to where the next heading starts. The Executive Summary starts at the top of page 1, so the memo's
    request and scope belong to it; the contents page is not a passage.

    A section or subsection's own text is its heading; a page's provision is its section's followed by `.p` and the
    page number, such as `3.1.p77`. Every passage's `heading` is its top-level section's heading.
    """
    contents_page, entries = contents(pages)
    by_provision = {e.provision: e for e in entries}
    page_lines = [_lines(page) for page in pages]
    starts: list[tuple[int, int, int]] = [(entries[0].page, 0, 0)]
    for entry in entries[1:]:
        starts.append((entry.page, *_heading_at(page_lines[entry.page - 1], entry)))

    def top_heading(entry: Entry) -> str:
        return by_provision[entry.parent].heading if entry.parent else entry.heading

    result: list[Passage] = []
    for n, entry in enumerate(entries):
        heading = top_heading(entry)
        context = heading if entry.parent is None else f"{heading} {entry.heading}"
        result.append(Passage(entry.provision, entry.parent, heading, heading, entry.heading, len(result)))
        start_page, start_line, heading_lines = starts[n]
        end_page, end_line, _ = starts[n + 1] if n + 1 < len(entries) else (len(pages), len(page_lines[-1]), 0)
        for page in range(start_page, end_page + 1):
            if page == contents_page:
                continue
            lines = page_lines[page - 1]
            first = start_line + heading_lines if page == start_page else 0
            last = end_line if page == end_page and n + 1 < len(entries) else len(lines)
            text = "\n".join(lines[first:last]).strip()
            if text:
                result.append(
                    Passage(f"{entry.provision}.p{page}", entry.provision, heading, context, text, len(result))
                )
    return result
