"""The text embedded for search: one entry for each passage, and one more for each provision with children.

A passage's own entry is its section heading, its nearest ancestor's own text (left out when that ancestor is the
section, whose text is its amendment history) and its text. A provision with children also gets an entry of its
text with all its descendants' text when that fits `subtree_chars`, and otherwise an outline of its text and each
child's summary, so a question answered by a provision whose own text is only a lead-in can still find it. A search
ranks each provision by its best entry; citations quote `passages`, never an entry.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from sf_docs_ingest.passages.outline import Passage
from sf_docs_ingest.passages.summary import summary

type EntryKind = Literal["own", "subtree", "outline"]


@dataclass(frozen=True)
class SearchEntry:
    provision: str
    kind: EntryKind
    text: str


def search_entries(passages: Sequence[Passage], subtree_chars: int) -> list[SearchEntry]:
    by_provision = {p.provision: p for p in passages}
    children: dict[str, list[Passage]] = {}
    for p in passages:
        if p.parent_provision is not None:
            children.setdefault(p.parent_provision, []).append(p)

    def short_context(p: Passage) -> str:
        parent = by_provision.get(p.parent_provision) if p.parent_provision else None
        if parent is None or parent.parent_provision is None:
            return p.heading
        return f"{p.heading} {parent.text}"

    def descendants(p: Passage) -> list[Passage]:
        found: list[Passage] = []
        for child in children.get(p.provision, []):
            found += [child, *descendants(child)]
        return found

    entries = [SearchEntry(p.provision, "own", f"{short_context(p)}\n{p.text}") for p in passages]
    for p in passages:
        if p.provision not in children:
            continue
        subtree = "\n".join([short_context(p), p.text, *(d.text for d in descendants(p))])
        if len(subtree) <= subtree_chars:
            entries.append(SearchEntry(p.provision, "subtree", subtree))
        else:
            outline = [short_context(p), p.text, *(summary(c) for c in children[p.provision])]
            entries.append(SearchEntry(p.provision, "outline", "\n".join(outline)))
    return entries
