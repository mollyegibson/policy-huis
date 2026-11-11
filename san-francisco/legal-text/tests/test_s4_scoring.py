import math
from pathlib import Path

import pytest

from spikes.s4.scoring import (
    Question,
    Tree,
    hit,
    label_errors,
    load_questions,
    mcnemar_p,
    ndcg,
    near_hit,
    reciprocal_rank,
)

TREE = Tree(
    {"37.9": None, "37.9(a)": "37.9", "37.9(a)(8)": "37.9(a)", "37.9(a)(8)(ii)": "37.9(a)(8)", "37.9(b)": "37.9"}
)
QUESTION = Question("q", "?", "everyday", None, {"37.9(a)(8)(ii)": 2, "37.9(b)": 1})


def test_hit_counts_only_grade_two_within_k() -> None:
    assert hit(QUESTION, ["x", "37.9(b)", "37.9(a)(8)(ii)"], 3) == 1.0
    assert hit(QUESTION, ["x", "37.9(b)", "37.9(a)(8)(ii)"], 2) == 0.0


def test_near_hit_credits_parent_and_child_but_not_grandparent() -> None:
    assert near_hit(QUESTION, ["37.9(a)(8)"], 5, TREE) == 1.0
    assert near_hit(QUESTION, ["37.9(a)"], 5, TREE) == 0.0
    parent_labelled = Question("q", "?", "legal", None, {"37.9(a)": 2})
    assert near_hit(parent_labelled, ["37.9(a)(8)"], 5, TREE) == 1.0


def test_ndcg_is_one_for_the_ideal_order_and_discounts_lower_ranks() -> None:
    assert ndcg(QUESTION, ["37.9(a)(8)(ii)", "37.9(b)"]) == pytest.approx(1.0)
    swapped = (1 + 3 / math.log2(3)) / (3 + 1 / math.log2(3))
    assert ndcg(QUESTION, ["37.9(b)", "37.9(a)(8)(ii)"]) == pytest.approx(swapped)
    assert ndcg(QUESTION, ["x"] * 10 + ["37.9(a)(8)(ii)"]) == 0.0


def test_reciprocal_rank_uses_any_labelled_provision() -> None:
    assert reciprocal_rank(QUESTION, ["x", "37.9(b)"]) == 0.5
    assert reciprocal_rank(QUESTION, ["x"]) == 0.0


def test_mcnemar_counts_discordant_pairs() -> None:
    assert mcnemar_p([1, 1, 1, 0], [0, 0, 1, 0]) == (2, 0, 0.5)
    assert mcnemar_p([1, 0], [1, 0]) == (0, 0, 1.0)


def test_label_errors_report_missing_provisions_and_quotes(tmp_path: Path) -> None:
    path = tmp_path / "questions.yaml"
    path.write_text(
        """questions:
  - id: q1
    question: "?"
    wording: everyday
    relevant:
      - provision: "37.9(b)"
        grade: 2
        quote: "(b) A landlord ... same   rental unit"
      - provision: "37.9(c)"
        grade: 1
        quote: "anything"
      - provision: "37.9(a)"
        grade: 1
        quote: "not in the text"
"""
    )
    texts = {"37.9(b)": "(b) A landlord who resides in the same\nrental unit", "37.9(a)": "(a) A landlord shall not"}
    assert label_errors(path, texts) == [
        "q1: 37.9(c) is not a passage",
        "q1: 37.9(a) does not contain 'not in the text'",
    ]
    assert [q.answers for q in load_questions(path)] == [frozenset({"37.9(b)"})]


def test_load_questions_refuses_an_answerable_question_without_grade_two(tmp_path: Path) -> None:
    path = tmp_path / "questions.yaml"
    path.write_text(
        """questions:
  - id: q1
    question: "?"
    wording: everyday
    relevant:
      - provision: "37.9(b)"
        grade: 1
        quote: "x"
"""
    )
    with pytest.raises(ValueError, match="grade-2"):
        load_questions(path)
