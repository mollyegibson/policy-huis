"""Passages from Amsterdam's housing ordinance, split by article."""

from collections.abc import Sequence

from ams_docs_ingest.passages.outline import Passage, split_articles


def passages(pages: Sequence[str]) -> list[Passage]:
    """One passage per article, from the first article heading on."""
    return split_articles(pages)
