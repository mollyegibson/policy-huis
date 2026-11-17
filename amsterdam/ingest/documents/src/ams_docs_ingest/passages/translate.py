"""Translating Dutch passages to English once, at load time."""

from collections.abc import Sequence
from typing import Protocol

from ams_docs_ingest.passages.outline import Passage, TranslatedPassage


class Translator(Protocol):
    @property
    def model_id(self) -> str: ...
    def translate(self, texts: Sequence[str]) -> list[str]: ...


def translate_passages(passages: Sequence[Passage], translator: Translator) -> list[TranslatedPassage]:
    """Translate each passage's Dutch text, keeping the original and the model's identifier."""
    translated = translator.translate([passage.text for passage in passages])
    if len(translated) != len(passages):
        raise ValueError(f"{translator.model_id} returned {len(translated)} translations for {len(passages)} passages")
    return [
        TranslatedPassage(passage=passage, text_en=text_en, translation_model=translator.model_id)
        for passage, text_en in zip(passages, translated, strict=True)
    ]
