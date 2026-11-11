import pytest

from spikes.s4 import entries as entries_module
from spikes.s4.entries import Entry, Passage, best_per_provision, entries, first_sentence

HEADING = "Sec. 37.9 Evictions"
PASSAGES = [
    Passage("37.9", None, HEADING, HEADING, "[Amended by Ord. No. 1.]"),
    Passage("37.9(a)", "37.9", HEADING, HEADING, "(a) A landlord shall not endeavor to recover possession unless:"),
    Passage(
        "37.9(a)(8)", "37.9(a)", HEADING, f"{HEADING} (a) unless:", "(8) The landlord seeks possession in good faith;"
    ),
    Passage("37.9(a)(8)(ii)", "37.9(a)(8)", HEADING, f"{HEADING} (a) unless: (8) good faith;", "(ii) For a relative."),
]


def by_kind(result: list[Entry], kind: str) -> dict[str, str]:
    return {e.provision: e.text for e in result if e.kind == kind}


def test_context_form_is_the_stored_context_and_text() -> None:
    assert entries(PASSAGES, "context")[3] == Entry(
        "37.9(a)(8)(ii)", "own", f"{HEADING} (a) unless: (8) good faith;\n(ii) For a relative."
    )


def test_short_form_uses_the_nearest_lead_in_but_not_the_section_history() -> None:
    own = by_kind(entries(PASSAGES, "short"), "own")
    assert own["37.9(a)"] == f"{HEADING}\n(a) A landlord shall not endeavor to recover possession unless:"
    assert own["37.9(a)(8)(ii)"] == f"{HEADING} (8) The landlord seeks possession in good faith;\n(ii) For a relative."


def test_subtree_form_adds_each_parent_with_its_descendants() -> None:
    result = entries(PASSAGES, "subtree")
    assert len(by_kind(result, "own")) == 4
    subtree = by_kind(result, "subtree")
    assert set(subtree) == {"37.9", "37.9(a)", "37.9(a)(8)"}
    assert subtree["37.9(a)"].endswith("(8) The landlord seeks possession in good faith;\n(ii) For a relative.")


def test_subtree_form_outlines_a_parent_over_the_size_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(entries_module, "SUBTREE_CHARS", 152)
    result = entries(PASSAGES, "subtree")
    assert set(by_kind(result, "outline")) == {"37.9", "37.9(a)", "37.9(a)(8)"}
    assert by_kind(result, "outline")["37.9(a)"].endswith("(8) The landlord seeks possession in good faith;")


def test_first_sentence_stops_at_the_first_full_stop_semicolon_or_colon() -> None:
    assert first_sentence("(1) The tenant: (A) has failed") == "(1) The tenant:"
    assert first_sentence("Sec. 37.9C. Relocation") == "Sec. 37.9C."
    assert first_sentence("no stop at all") == "no stop at all"
    assert first_sentence("[Amended by Ord. No. 295-79, effective 1979; Ord. No. 1-80]") == (
        "[Amended by Ord. No. 295-79, effective 1979;"
    )
    assert first_sentence("held in Larson v. CCSF. The Board") == "held in Larson v. CCSF."


def test_best_per_provision_keeps_each_provision_at_its_best_rank() -> None:
    ranked = [Entry("b", "subtree", ""), Entry("a", "own", ""), Entry("b", "own", ""), Entry("c", "own", "")]
    assert best_per_provision(ranked, 10) == ["b", "a", "c"]
    assert best_per_provision(ranked, 2) == ["b", "a"]
