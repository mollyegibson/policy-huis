from policyhuis_legal_text.outline import Passage
from policyhuis_legal_text.search_entries import SearchEntry, search_entries
from policyhuis_legal_text.summary import first_sentence, summary

HEADING = "Sec. 37.9 Evictions"


def passage(provision: str, parent: str | None, text: str, ordinal: int) -> Passage:
    return Passage(
        provision=provision, parent_provision=parent, heading=HEADING, context="", text=text, ordinal=ordinal
    )


PASSAGES = [
    passage("37.9", None, "[Amended by Ord. No. 1.]", 0),
    passage("37.9(a)", "37.9", "(a) A landlord shall not endeavor to recover possession unless:", 1),
    passage("37.9(a)(8)", "37.9(a)", "(8) The landlord seeks possession in good faith;", 2),
    passage("37.9(a)(8)(ii)", "37.9(a)(8)", "(ii) For a relative.", 3),
]


def by_kind(entries: list[SearchEntry], kind: str) -> dict[str, str]:
    return {e.provision: e.text for e in entries if e.kind == kind}


def test_first_sentence_skips_the_ordinance_s_abbreviations() -> None:
    assert first_sentence("(1) The tenant: (A) has failed") == "(1) The tenant:"
    assert first_sentence("Sec. 37.9C. Relocation") == "Sec. 37.9C."
    assert first_sentence("[Amended by Ord. No. 295-79, effective 1979; Ord. No. 1-80]") == (
        "[Amended by Ord. No. 295-79, effective 1979;"
    )
    assert first_sentence("held in Larson v. CCSF. The Board") == "held in Larson v. CCSF."
    assert first_sentence("no stop at all") == "no stop at all"
    assert len(first_sentence("x" * 1000)) == 300


def test_a_section_is_summarized_by_its_heading_and_a_subsection_by_its_first_sentence() -> None:
    assert summary(PASSAGES[0]) == HEADING
    assert summary(PASSAGES[2]) == "(8) The landlord seeks possession in good faith;"


def test_an_own_entry_carries_the_nearest_lead_in_but_not_the_section_history() -> None:
    own = by_kind(search_entries(PASSAGES, 10_000), "own")
    assert own["37.9(a)"] == f"{HEADING}\n(a) A landlord shall not endeavor to recover possession unless:"
    assert own["37.9(a)(8)(ii)"] == f"{HEADING} (8) The landlord seeks possession in good faith;\n(ii) For a relative."


def test_a_provision_with_children_is_also_searched_with_its_descendants() -> None:
    entries = search_entries(PASSAGES, 10_000)
    assert len(by_kind(entries, "own")) == 4
    subtree = by_kind(entries, "subtree")
    assert set(subtree) == {"37.9", "37.9(a)", "37.9(a)(8)"}
    assert subtree["37.9(a)"].endswith("(8) The landlord seeks possession in good faith;\n(ii) For a relative.")


def test_a_provision_over_the_limit_is_searched_with_an_outline_of_its_children() -> None:
    outline = by_kind(search_entries(PASSAGES, 152), "outline")
    assert set(outline) == {"37.9", "37.9(a)", "37.9(a)(8)"}
    assert outline["37.9(a)"].endswith("unless:\n(8) The landlord seeks possession in good faith;")
