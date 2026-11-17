"""Passages from an Amsterdam council document, split by its headings."""

from collections.abc import Sequence

from ams_docs_ingest.passages.outline import Passage, split_headings


def passages(pages: Sequence[str]) -> list[Passage]:
    """One passage per numbered or Markdown heading, from the first heading on."""
    return split_headings(pages)
