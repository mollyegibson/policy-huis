"""A provision's one-line summary, as an outline shows it: a section's heading, or the first sentence of its text."""

import re

from sf_docs_ingest.passages.outline import Passage

FIRST_SENTENCE_CHARS = 300
ABBREVIATIONS = frozenset({"Ord", "No", "Nos", "Sec", "Secs", "v", "S", "C", "App", "Cal", "Stats", "Ch", "seq"})


def first_sentence(text: str) -> str:
    """Text up to the first semicolon or colon followed by a space or the end, or the first full stop followed by
    the end or by a space and a capital letter or "(", skipping abbreviations that end in a full stop ("Sec.",
    "Ord. No.", "Larson v. CCSF"); at most `FIRST_SENTENCE_CHARS` characters."""
    end = len(text)
    for match in re.finditer(r"[;:](?=\s|$)|\.(?=$|\s+[A-Z(])", text):
        word = re.search(r"(?:^|[^A-Za-z0-9])([A-Za-z]+)$", text[: match.start()])
        if match.group() == "." and word and word.group(1) in ABBREVIATIONS:
            continue
        end = match.end()
        break
    return text[: min(end, FIRST_SENTENCE_CHARS)].strip()


def summary(passage: Passage) -> str:
    """A section's heading, since a section's own text is its amendment history; otherwise its first sentence."""
    return passage.heading if passage.parent_provision is None else first_sentence(passage.text)
