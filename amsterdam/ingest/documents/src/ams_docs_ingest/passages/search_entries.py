"""The text embedded for search: one entry for each passage, and one more for each provision with children.

A passage's own entry is its heading, its nearest ancestor's own text (left out when that ancestor is the article)
and its English text. A provision with children also gets an entry of its text with all its descendants' text when
that fits `subtree_chars`, and otherwise an outline of its text and each child's summary, so a question answered by
a provision whose own text is only a lead-in can still find it. A search ranks each provision by its best entry;
citations quote `passages`, never an entry.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from ams_docs_ingest.passages.outline import TranslatedPassage
from ams_docs_ingest.passages.summary import summary

type EntryKind = Literal["own", "subtree", "outline"]


@dataclass(frozen=True)
class SearchEntry:
    provision: str
    kind: EntryKind
    text: str


def search_entries(passages: Sequence[TranslatedPassage], subtree_chars: int) -> list[SearchEntry]:
    by_provision = {p.passage.provision: p for p in passages}
    children: dict[str, list[TranslatedPassage]] = {}
    for p in passages:
        if p.passage.parent_provision is not None:
            children.setdefault(p.passage.parent_provision, []).append(p)

    def short_context(p: TranslatedPassage) -> str:
        parent = by_provision.get(p.passage.parent_provision) if p.passage.parent_provision else None
        if parent is None or parent.passage.parent_provision is None:
            return p.passage.heading
        return f"{p.passage.heading} {parent.text_en}"

    def descendants(p: TranslatedPassage) -> list[TranslatedPassage]:
        found: list[TranslatedPassage] = []
        for child in children.get(p.passage.provision, []):
            found += [child, *descendants(child)]
        return found

    entries = [SearchEntry(p.passage.provision, "own", f"{short_context(p)}\n{p.text_en}") for p in passages]
    for p in passages:
        if p.passage.provision not in children:
            continue
        subtree = "\n".join([short_context(p), p.text_en, *(d.text_en for d in descendants(p))])
        if len(subtree) <= subtree_chars:
            entries.append(SearchEntry(p.passage.provision, "subtree", subtree))
        else:
            outline = [short_context(p), p.text_en, *(summary(c) for c in children[p.passage.provision])]
            entries.append(SearchEntry(p.passage.provision, "outline", "\n".join(outline)))
    return entries
