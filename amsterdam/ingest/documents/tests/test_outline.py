import pytest

from ams_docs_ingest.passages.outline import split_articles, split_headings
from tests.fixtures import ORDINANCE_PAGES, REPORT_PAGES


def pages(lines: list[list[str]]) -> list[str]:
    return ["\n".join(page) for page in lines]


def test_articles_start_at_their_headings_and_run_to_the_next() -> None:
    passages = split_articles(pages(ORDINANCE_PAGES))
    assert [(p.provision, p.heading) for p in passages] == [
        ("1.1", "Artikel 1.1 Begripsbepalingen"),
        ("1.2", "Artikel 1.2 Toepassingsgebied"),
    ]
    assert passages[0].text.startswith("In deze verordening")
    assert passages[0].context == "Artikel 1.1 Begripsbepalingen"
    assert [p.ordinal for p in passages] == [0, 1]


def test_a_document_with_no_article_heading_fails() -> None:
    with pytest.raises(ValueError, match="no article headings found"):
        split_articles(["Geen artikelen hier."])


def test_headings_split_a_report() -> None:
    passages = split_headings(pages(REPORT_PAGES))
    assert [(p.provision, p.heading) for p in passages] == [("1", "1. Inleiding"), ("2", "2. Doelen")]
    assert passages[0].text == "Dit plan beschrijft de woningbouw in Amsterdam."


def test_a_report_with_no_heading_fails() -> None:
    with pytest.raises(ValueError, match="no headings found"):
        split_headings(["Alleen lopende tekst."])
