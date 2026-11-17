"""Splitting a Dutch document into passages along its own structure."""

import re
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class Passage:
    """One provision's own text, with the lead-in text of the provisions above it as `context`.

    `provision` names it within its document, such as `7:248`; `parent_provision` is the provision it sits under,
    or null for a top-level article; `heading` is the article's heading; `ordinal` is its order in the document.
    """

    provision: str
    parent_provision: str | None
    heading: str
    context: str
    text: str
    ordinal: int


@dataclass(frozen=True)
class TranslatedPassage:
    """A passage with its English translation and the translation model's identifier."""

    passage: Passage
    text_en: str
    translation_model: str


_ARTICLE = re.compile(r"^(?:Artikel|Art\.?)\s+(?P<number>\S+)\s*(?P<title>.*)$")
_HEADING = re.compile(r"^(?:\d+(?:\.\d+)*\.?|#+)\s+\S")


def split_articles(pages: Sequence[str], first_ordinal: int = 0) -> list[Passage]:
    """One passage per article heading, from the heading to the next.

    A heading is a line beginning with "Artikel" or "Art." followed by the article number, such as "Artikel 7:248"
    or "Art. 1.1". The article's own text is its body and its context is its heading. Fails when the document holds
    no article heading, so a layout the rule misses cannot silently merge articles.
    """
    lines = [line.strip() for page in pages for line in page.split("\n")]
    starts = [i for i, line in enumerate(lines) if _ARTICLE.match(line)]
    if not starts:
        raise ValueError("no article headings found")
    result: list[Passage] = []
    for n, start in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(lines)
        match = _ARTICLE.match(lines[start])
        if match is None:
            continue
        number = match.group("number").rstrip(".:")
        title = match.group("title").strip()
        heading = f"Artikel {number} {title}".strip()
        result.append(
            Passage(
                provision=number,
                parent_provision=None,
                heading=heading,
                context=heading,
                text="\n".join(lines[start + 1 : end]).strip(),
                ordinal=first_ordinal + len(result),
            )
        )
    return result


def split_headings(pages: Sequence[str], first_ordinal: int = 0) -> list[Passage]:
    """One passage per numbered or Markdown heading, for a report or council document.

    A heading is a line beginning with a section number, such as "1. Inleiding", or a Markdown "#". The heading's
    number is the provision when it has one, else a slug of its text. Fails when the document holds no heading.
    """
    lines = [line.strip() for page in pages for line in page.split("\n")]
    starts = [i for i, line in enumerate(lines) if _HEADING.match(line)]
    if not starts:
        raise ValueError("no headings found")
    result: list[Passage] = []
    for n, start in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(lines)
        title = lines[start].lstrip("#").strip()
        number = re.match(r"^\d+(?:\.\d+)*", title)
        provision = number.group(0) if number is not None else _slug(title)
        result.append(
            Passage(
                provision=provision,
                parent_provision=None,
                heading=title,
                context=title,
                text="\n".join(lines[start + 1 : end]).strip(),
                ordinal=first_ordinal + len(result),
            )
        )
    return result


def _slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
