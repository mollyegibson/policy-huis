"""Spike S4 scoring: the question set, its label checks, and the measures each search is scored on."""

import math
import random
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

import yaml

GRADES = (1, 2)
WORDINGS = ("everyday", "legal", "term")
NDCG_DEPTH = 10
BOOTSTRAP_SAMPLES = 10_000


@dataclass(frozen=True)
class Question:
    id: str
    question: str
    wording: str
    pair: str | None
    grades: Mapping[str, int]

    @property
    def answers(self) -> frozenset[str]:
        """The grade-2 provisions: any one of them in the results answers the question."""
        return frozenset(p for p, g in self.grades.items() if g == 2)


@dataclass(frozen=True)
class Tree:
    """The passages' provision hierarchy, from `parent_provision`."""

    parent: Mapping[str, str | None]

    def neighbours(self, provision: str) -> set[str]:
        """The provision, its parent and its children."""
        near = {provision, *(c for c, p in self.parent.items() if p == provision)}
        if parent := self.parent.get(provision):
            near.add(parent)
        return near


def load_questions(path: Path) -> list[Question]:
    doc = yaml.safe_load(path.read_text())
    questions = []
    for q in doc["questions"]:
        grades: dict[str, int] = {}
        for r in q.get("relevant") or []:
            if r["grade"] not in GRADES:
                raise ValueError(f"{q['id']}: {r['provision']} has grade {r['grade']}, not one of {GRADES}")
            if r["provision"] in grades:
                raise ValueError(f"{q['id']}: {r['provision']} is labelled twice")
            grades[r["provision"]] = r["grade"]
        if grades and 2 not in grades.values():
            raise ValueError(f"{q['id']}: an answerable question needs at least one grade-2 provision")
        if q["wording"] not in WORDINGS:
            raise ValueError(f"{q['id']}: wording {q['wording']!r} is not one of {WORDINGS}")
        questions.append(Question(q["id"], q["question"], q["wording"], q.get("pair"), grades))
    ids = {q.id for q in questions}
    if len(ids) != len(questions):
        raise ValueError("question ids are not unique")
    for q in questions:
        if q.pair is not None and q.pair not in ids:
            raise ValueError(f"{q.id}: pair {q.pair} is not a question")
    return questions


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def label_errors(path: Path, texts: Mapping[str, str]) -> list[str]:
    """Every labelled provision that is not a passage, and every quote fragment (split at "...") that is not in its
    provision's text."""
    errors = []
    for q in yaml.safe_load(path.read_text())["questions"]:
        for r in q.get("relevant") or []:
            text = texts.get(r["provision"])
            if text is None:
                errors.append(f"{q['id']}: {r['provision']} is not a passage")
                continue
            for fragment in r["quote"].split("..."):
                if _normalize(fragment) not in _normalize(text):
                    errors.append(f"{q['id']}: {r['provision']} does not contain {fragment.strip()[:60]!r}")
    return errors


def hit(q: Question, ranking: Sequence[str], k: int) -> float:
    """1 when a grade-2 provision is in the top k."""
    return 1.0 if q.answers & set(ranking[:k]) else 0.0


def near_hit(q: Question, ranking: Sequence[str], k: int, tree: Tree) -> float:
    """1 when a grade-2 provision, its parent or one of its children is in the top k: a result from which the
    answer is one step away in the provision tree."""
    near = set().union(*(tree.neighbours(p) for p in q.answers))
    return 1.0 if near & set(ranking[:k]) else 0.0


def ndcg(q: Question, ranking: Sequence[str], depth: int = NDCG_DEPTH) -> float:
    """Normalized discounted cumulative gain over the top `depth`, with gain 2^grade - 1."""

    def dcg(grades: Sequence[int]) -> float:
        return sum((2**g - 1) / math.log2(i + 2) for i, g in enumerate(grades[:depth]))

    ideal = dcg(sorted(q.grades.values(), reverse=True))
    return dcg([q.grades.get(p, 0) for p in ranking]) / ideal


def reciprocal_rank(q: Question, ranking: Sequence[str]) -> float:
    """1 / the rank of the first labelled provision, or 0 when none is in the ranking."""
    return next((1 / i for i, p in enumerate(ranking, start=1) if p in q.grades), 0.0)


def first_answer_rank(q: Question, ranking: Sequence[str]) -> int | None:
    return next((i for i, p in enumerate(ranking, start=1) if p in q.answers), None)


def measures(tree: Tree) -> dict[str, Callable[[Question, Sequence[str]], float]]:
    return {
        "hit@5": lambda q, r: hit(q, r, 5),
        "hit@10": lambda q, r: hit(q, r, 10),
        "near hit@5": lambda q, r: near_hit(q, r, 5, tree),
        "near hit@10": lambda q, r: near_hit(q, r, 10, tree),
        f"nDCG@{NDCG_DEPTH}": ndcg,
        "MRR": reciprocal_rank,
    }


def bootstrap_interval(values: Sequence[float], seed: int = 0) -> tuple[float, float]:
    """95% percentile bootstrap interval of the mean, resampling questions."""
    rng = random.Random(seed)
    n = len(values)
    means = sorted(sum(rng.choices(values, k=n)) / n for _ in range(BOOTSTRAP_SAMPLES))
    return means[int(0.025 * BOOTSTRAP_SAMPLES)], means[int(0.975 * BOOTSTRAP_SAMPLES) - 1]


def mcnemar_p(a: Sequence[float], b: Sequence[float]) -> tuple[int, int, float]:
    """Exact two-sided McNemar test on paired 0/1 outcomes: the count only `a` hits, the count only `b` hits, and
    the p-value."""
    only_a = sum(1 for x, y in zip(a, b, strict=True) if x and not y)
    only_b = sum(1 for x, y in zip(a, b, strict=True) if y and not x)
    n = only_a + only_b
    if n == 0:
        return only_a, only_b, 1.0
    tail = sum(math.comb(n, i) for i in range(min(only_a, only_b) + 1)) / 2**n
    return only_a, only_b, min(1.0, 2 * tail)
