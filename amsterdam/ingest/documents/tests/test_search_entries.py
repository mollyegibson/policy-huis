from ams_docs_ingest.passages.outline import Passage, TranslatedPassage
from ams_docs_ingest.passages.search_entries import SearchEntry, search_entries
from ams_docs_ingest.passages.summary import first_sentence, summary

HEADING = "Artikel 7:248"


def translated(provision: str, parent: str | None, text_nl: str, text_en: str, ordinal: int) -> TranslatedPassage:
    return TranslatedPassage(
        passage=Passage(provision, parent, HEADING, HEADING, text_nl, ordinal),
        text_en=text_en,
        translation_model="fake/translator@host",
    )


PASSAGES = [
    translated("7:248", None, "NL artikel", "The landlord may recover possession.", 0),
    translated("7:248a", "7:248", "NL lid a", "The tenant may object to the landlord.", 1),
    translated("7:248a.1", "7:248a", "NL onderdeel 1", "The objection must be filed in writing.", 2),
]


def by_kind(entries: list[SearchEntry], kind: str) -> dict[str, str]:
    return {e.provision: e.text for e in entries if e.kind == kind}


def test_first_sentence_reads_a_dutch_abbreviation() -> None:
    assert first_sentence("Art. 7:248 is van toepassing. De rest.") == "Art. 7:248 is van toepassing."
    assert first_sentence("Geen zinsnede") == "Geen zinsnede"


def test_an_article_is_summarized_by_its_heading_and_a_subsection_by_its_first_sentence() -> None:
    assert summary(PASSAGES[0]) == HEADING
    assert summary(PASSAGES[1]) == "The tenant may object to the landlord."


def test_an_own_entry_carries_the_nearest_lead_in_and_the_english_text() -> None:
    own = by_kind(search_entries(PASSAGES, 10_000), "own")
    assert own["7:248a"] == f"{HEADING}\nThe tenant may object to the landlord."
    assert (
        own["7:248a.1"] == f"{HEADING} The tenant may object to the landlord.\nThe objection must be filed in writing."
    )


def test_a_provision_with_children_is_also_searched_with_its_descendants() -> None:
    entries = search_entries(PASSAGES, 10_000)
    assert len(by_kind(entries, "own")) == 3
    subtree = by_kind(entries, "subtree")
    assert set(subtree) == {"7:248", "7:248a"}
    assert subtree["7:248a"].endswith("The objection must be filed in writing.")


def test_a_provision_over_the_limit_is_searched_with_an_outline_of_its_children() -> None:
    outline = by_kind(search_entries(PASSAGES, 60), "outline")
    assert set(outline) == {"7:248", "7:248a"}
    assert outline["7:248a"].endswith("The objection must be filed in writing.")
