"""Splitting a section of law into passages along its enumerated subsections, such as (a), (1), (A) and (i)."""

import re
from dataclasses import dataclass
from typing import Literal

type Kind = Literal["letter", "digit", "upper", "roman", "upper_roman"]

_MARKER = re.compile(r"^\((?P<label>[a-z]{1,5}|[0-9]{1,3}|[A-Z]{1,5})\)(?:\s+(?P<rest>.*))?$")
_CHAINED = re.compile(r"^(\([a-z]{1,5}\))\s+(\((?:[a-z]{1,5}|[0-9]{1,3}|[A-Z]{1,5})\)\s+.*)$")
_ROMAN = re.compile(r"^(x{0,3})(ix|iv|v?i{0,3})$")
_ROMAN_VALUES = {"i": 1, "v": 5, "x": 10}
_FIRST: dict[Kind, str] = {"letter": "a", "digit": "1", "upper": "A", "roman": "i", "upper_roman": "I"}


@dataclass(frozen=True)
class Passage:
    """One provision's own text, with the lead-in text of the provisions above it as `context`.

    `provision` names it within its document, such as `37.9(a)(8)`; `parent_provision` is the provision it sits under,
    or null for a section; `heading` is the section's heading; `ordinal` is its order within the document.
    """

    provision: str
    parent_provision: str | None
    heading: str
    context: str
    text: str
    ordinal: int


def _roman_value(label: str) -> int:
    total = 0
    for i, char in enumerate(label):
        value = _ROMAN_VALUES[char]
        following = _ROMAN_VALUES[label[i + 1]] if i + 1 < len(label) else 0
        total += -value if value < following else value
    return total


def _to_roman(value: int) -> str:
    numerals = [(10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i")]
    out = ""
    for amount, numeral in numerals:
        while value >= amount:
            out += numeral
            value -= amount
    return out


def _kinds(label: str) -> list[Kind]:
    if label.isdigit():
        return ["digit"]
    roman = _ROMAN.match(label.lower()) is not None
    kinds: list[Kind] = []
    if label.isupper():
        if roman:
            kinds.append("upper_roman")
        if len(label) == 1:
            kinds.append("upper")
        return kinds
    if roman:
        kinds.append("roman")
    if len(label) == 1:
        kinds.append("letter")
    return kinds


def _next(kind: Kind, label: str) -> str:
    match kind:
        case "digit":
            return str(int(label) + 1)
        case "letter" | "upper":
            return chr(ord(label) + 1)
        case "roman":
            return _to_roman(_roman_value(label) + 1)
        case "upper_roman":
            return _to_roman(_roman_value(label.lower()) + 1).upper()


def _place(stack: list[tuple[Kind, str]], label: str) -> list[tuple[Kind, str]] | None:
    """The outline position of a marker: the next sibling of an open level, deepest first, or the first item of a new
    level below the deepest. A new level may repeat a kind open higher up, as in `(vii)(1)`, but not the deepest
    level's own kind. None when the marker fits neither, so the line is ordinary text."""
    kinds = _kinds(label)
    for depth in range(len(stack) - 1, -1, -1):
        kind, previous = stack[depth]
        if kind in kinds and label == _next(kind, previous):
            return [*stack[:depth], (kind, label)]
    deepest = stack[-1][0] if stack else None
    for kind in kinds:
        if label == _FIRST[kind] and kind != deepest:
            return [*stack, (kind, label)]
    return None


def _unchain(lines: list[str]) -> list[str]:
    """Splits a line that opens two levels at once, such as "(b) (1) For notices", into one line per marker."""
    out: list[str] = []
    for line in lines:
        match = _CHAINED.match(line.strip())
        out.extend([match.group(1), match.group(2)] if match is not None else [line])
    return out


def _join(lines: list[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def split_section(section: str, heading: str, lines: list[str], first_ordinal: int) -> list[Passage]:
    """Passages for one section: its text before any subsection, then one per subsection.

    A subsection starts at a line beginning with a marker such as `(a)` followed by text that does not start in
    lowercase, so a wrapped cross-reference such as "(2) of this Section" stays in the text. Markers nest as letters,
    digits, capitals and Roman numerals in either case, in the order they first open; `(i)` is the letter after `(h)`
    when a letter level is open at that point, and a Roman numeral otherwise. A marker that fits no open level stays
    in the text of the passage before it.
    """
    blocks: list[tuple[list[tuple[Kind, str]], list[str]]] = [([], [])]
    stack: list[tuple[Kind, str]] = []
    for line in _unchain(lines):
        match = _MARKER.match(line.strip())
        if match is not None and not (match.group("rest") or "")[:1].islower():
            placed = _place(stack, match.group("label"))
            if placed is not None:
                stack = placed
                blocks.append((stack, [line.strip()]))
                continue
        blocks[-1][1].append(line)

    def provision(path: list[tuple[Kind, str]]) -> str:
        return section + "".join(f"({label})" for _, label in path)

    lead_ins: dict[str, str] = {}
    passages: list[Passage] = []
    for path, block_lines in blocks:
        text = _join(block_lines)
        name = provision(path)
        parent = provision(path[:-1]) if path else None
        ancestors = [provision(path[:depth]) for depth in range(1, len(path))]
        context = " ".join([heading, *(lead_ins[a] for a in ancestors if lead_ins.get(a))])
        lead_ins[name] = text
        if not path and not text:
            continue
        passages.append(
            Passage(
                provision=name,
                parent_provision=parent,
                heading=heading,
                context=context,
                text=text,
                ordinal=first_ordinal + len(passages),
            )
        )
    return passages
