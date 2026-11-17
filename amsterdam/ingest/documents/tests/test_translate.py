import pytest

from ams_docs_ingest.passages.outline import split_articles
from ams_docs_ingest.passages.translate import translate_passages
from tests.fixtures import ORDINANCE_PAGES


class FakeTranslator:
    model_id = "fake/translator@host"

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def translate(self, texts: list[str]) -> list[str]:
        self.calls.append(list(texts))
        return [f"EN: {text}" for text in texts]


def test_each_passage_is_translated_with_the_model_id() -> None:
    translator = FakeTranslator()
    passages = split_articles(["\n".join(page) for page in ORDINANCE_PAGES])
    translated = translate_passages(passages, translator)
    assert [t.text_en for t in translated] == [f"EN: {p.text}" for p in passages]
    assert {t.translation_model for t in translated} == {"fake/translator@host"}
    assert translator.calls == [[p.text for p in passages]]


def test_a_short_translation_is_refused() -> None:
    class ShortTranslator(FakeTranslator):
        def translate(self, texts: list[str]) -> list[str]:
            return []

    passages = split_articles(["\n".join(page) for page in ORDINANCE_PAGES])
    with pytest.raises(ValueError, match="0 translations for 2 passages"):
        translate_passages(passages, ShortTranslator())
