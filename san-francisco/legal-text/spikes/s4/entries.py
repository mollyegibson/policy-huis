"""Spike S4's search entries: the text embedded for each provision, in the forms the spike compares.

- `context`: the passage's stored context (its heading and every ancestor's lead-in) followed by its text.
- `short`: the section heading and the nearest ancestor's own text (left out when that ancestor is the section
  itself, whose text is its amendment history), followed by the passage's text.
- `subtree`: the `short` entries, plus one entry for each provision with children: its heading, its own text and
  all its descendants' text when that fits `SUBTREE_CHARS`, and otherwise an outline of its own text and the first
  sentence of each child.

An entry names the provision it stands for; a search ranks provisions by their best-ranked entry.
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass

FORMS = ("context", "short", "subtree")
SUBTREE_CHARS = 10_000
FIRST_SENTENCE_CHARS = 300
ABBREVIATIONS = frozenset({"Ord", "No", "Nos", "Sec", "Secs", "v", "S", "C", "App", "Cal", "Stats", "Ch", "seq"})


@dataclass(frozen=True)
class Passage:
    provision: str
    parent: str | None
    heading: str
    context: str
    text: str


@dataclass(frozen=True)
class Entry:
    provision: str
    kind: str
    text: str


def first_sentence(text: str) -> str:
    """Text up to the first semicolon or colon followed by a space or the end, or the first full stop followed by
    the end or by a space and a capital letter or "(", skipping the ordinance's abbreviations ("Sec.", "Ord. No.");
    at most `FIRST_SENTENCE_CHARS` characters."""
    end = len(text)
    for match in re.finditer(r"[;:](?=\s|$)|\.(?=$|\s+[A-Z(])", text):
        word = re.search(r"(?:^|[^A-Za-z0-9])([A-Za-z]+)$", text[: match.start()])
        if match.group() == "." and word and word.group(1) in ABBREVIATIONS:
            continue
        end = match.end()
        break
    return text[: min(end, FIRST_SENTENCE_CHARS)].strip()


def entries(passages: Sequence[Passage], form: str) -> list[Entry]:
    if form == "context":
        return [Entry(p.provision, "own", f"{p.context}\n{p.text}") for p in passages]
    if form not in FORMS:
        raise ValueError(f"form {form!r} is not one of {FORMS}")

    by_provision = {p.provision: p for p in passages}
    children: dict[str, list[Passage]] = {}
    for p in passages:
        if p.parent is not None:
            children.setdefault(p.parent, []).append(p)

    def short_context(p: Passage) -> str:
        parent = by_provision.get(p.parent) if p.parent else None
        if parent is None or parent.parent is None:
            return p.heading
        return f"{p.heading} {parent.text}"

    def descendants(p: Passage) -> list[Passage]:
        found = []
        for child in children.get(p.provision, []):
            found += [child, *descendants(child)]
        return found

    result = [Entry(p.provision, "own", f"{short_context(p)}\n{p.text}") for p in passages]
    if form == "short":
        return result
    for p in passages:
        if p.provision not in children:
            continue
        subtree = "\n".join([short_context(p), p.text, *(d.text for d in descendants(p))])
        if len(subtree) <= SUBTREE_CHARS:
            result.append(Entry(p.provision, "subtree", subtree))
        else:
            outline = [short_context(p), p.text, *(first_sentence(c.text) for c in children[p.provision])]
            result.append(Entry(p.provision, "outline", "\n".join(outline)))
    return result


def best_per_provision(ranked: Sequence[Entry], limit: int) -> list[str]:
    """Provisions in the order of their best-ranked entry."""
    seen: dict[str, None] = {}
    for entry in ranked:
        seen.setdefault(entry.provision, None)
        if len(seen) == limit:
            break
    return list(seen)
