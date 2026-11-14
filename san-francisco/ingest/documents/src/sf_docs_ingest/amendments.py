"""The current text of a document that marks its deletions by striking text through, as San Francisco's amending
ordinances do."""

import re
from collections.abc import Sequence

from pydantic import BaseModel, ConfigDict, TypeAdapter


class Span(BaseModel):
    """A run of a line's text, all struck through or all not, as the shared PDF loader marks it."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    text: str
    struck: bool


MarkedLines = TypeAdapter(list[list[Span]])
"""A page's `lines`, as stored in its raw row by a PDF source with `strikethrough: marked`."""


def current_text(lines: Sequence[Sequence[Span]]) -> str:
    """A page's text as the ordinance leaves it: each line without its struck runs, which the ordinance deletes, and
    with its other runs, unchanged or added, kept. A line left empty is dropped, and runs of spaces become one."""
    kept = (re.sub(r"\s+", " ", "".join(span.text for span in line if not span.struck)).strip() for line in lines)
    return "\n".join(line for line in kept if line)
