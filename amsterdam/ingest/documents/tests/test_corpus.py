import hashlib
from collections.abc import Sequence
from pathlib import Path

import psycopg
import pytest
from policyhuis_ingest.archive import LocalArchive
from policyhuis_ingest.load import ingest
from policyhuis_ingest.source_types import PdfSource, load_sources
from policyhuis_ingest.testing import FakeFetcher, pdf
from pydantic import ValidationError

from ams_docs_ingest.corpus import CorpusEntry, build_passages, load_corpus, load_search_config
from ams_docs_ingest.settings import CORPUS_FILE, CORPUS_SCHEMA, RAW_SCHEMA, SEARCH_FILE, SOURCES_FILE
from tests.fixtures import ORDINANCE_PAGES


class FakeTranslator:
    model_id = "fake/translator@host"

    def translate(self, texts: Sequence[str]) -> list[str]:
        return [f"EN: {text}" for text in texts]


class FakeEmbedder:
    """Deterministic 2,560-dimension vectors from each text's hash, so tests need no embedding API."""

    model_id = "fake/model@host"

    def __init__(self) -> None:
        self.calls = 0

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        self.calls += 1
        return [[(b + 1) / 256 for b in hashlib.sha256(t.encode()).digest()] * 80 for t in texts]


def ordinance_source() -> PdfSource:
    return PdfSource(
        kind="pdf",
        url="https://example.org/huisvestingsverordening.pdf",
        title="Huisvestingsverordening Amsterdam 2024",
        publisher="Gemeente Amsterdam",
        version_pattern=r"^\(([A-Z][a-z]+ \d{1,2}, \d{4})\)",
        version_format="%B %d, %Y",
        format="pdf",
        raw_table="document_pages",
    )


def load_ordinance(
    url: str, archive: Path, translator: FakeTranslator | None = None, embedder: FakeEmbedder | None = None
) -> int:
    source = ordinance_source()
    fetcher = FakeFetcher({source.url: pdf(ORDINANCE_PAGES)})
    entry = CorpusEntry(document_type="law", description="Amsterdam's housing ordinance.", splitter="housing_ordinance")
    with psycopg.connect(url, autocommit=True) as conn:
        ingest("housing_ordinance", source, fetcher, LocalArchive(archive), conn, RAW_SCHEMA, "v1")
    return build_passages(
        url,
        RAW_SCHEMA,
        CORPUS_SCHEMA,
        "housing_ordinance",
        entry,
        embedder or FakeEmbedder(),
        translator or FakeTranslator(),
        load_search_config(SEARCH_FILE).subtree_chars,
    )


def test_every_document_in_the_corpus_is_a_source() -> None:
    assert set(load_corpus(CORPUS_FILE)) <= set(load_sources(SOURCES_FILE))


def test_passages_come_from_the_loaded_pages_with_the_manifest_s_version(migrated_url: str, tmp_path: Path) -> None:
    count = load_ordinance(migrated_url, tmp_path)
    with psycopg.connect(migrated_url) as conn:
        document = conn.execute(
            "SELECT document_type, version_date::text, publisher, language FROM ams_docs.documents"
        ).fetchone()
        passages = conn.execute(
            "SELECT provision, text_nl, text_en, translation_model FROM ams_docs.passages ORDER BY ordinal"
        ).fetchall()

    assert count == 2
    assert document == ("law", "2026-06-05", "Gemeente Amsterdam", "nl")
    assert passages[0][1].startswith("In deze verordening")
    assert passages[0][2] == f"EN: {passages[0][1]}"
    assert {p[3] for p in passages} == {"fake/translator@host"}


def test_rebuilding_replaces_the_document_s_passages(migrated_url: str, tmp_path: Path) -> None:
    load_ordinance(migrated_url, tmp_path)
    load_ordinance(migrated_url, tmp_path)
    with psycopg.connect(migrated_url) as conn:
        assert conn.execute("SELECT count(*) FROM ams_docs.passages").fetchone() == (2,)


def test_every_passage_has_a_summary_and_an_own_search_entry(migrated_url: str, tmp_path: Path) -> None:
    load_ordinance(migrated_url, tmp_path)
    with psycopg.connect(migrated_url) as conn:
        summaries = dict(conn.execute("SELECT provision, summary FROM ams_docs.passages").fetchall())
        entries = conn.execute(
            "SELECT provision, kind, embedding_model, vector_dims(embedding::vector) FROM ams_docs.search_entries"
        ).fetchall()

    assert summaries["1.1"] == "Artikel 1.1 Begripsbepalingen"
    assert all(summaries.values())
    assert {p for p, kind, _, _ in entries} == set(summaries)
    assert all(kind == "own" for _, kind, _, _ in entries)
    assert {embedding_model for _, _, embedding_model, _ in entries} == {"fake/model@host"}
    assert {dims for _, _, _, dims in entries} == {2560}


def test_a_failed_embedding_leaves_the_stored_document_as_it_was(migrated_url: str, tmp_path: Path) -> None:
    load_ordinance(migrated_url, tmp_path)

    class FailingEmbedder(FakeEmbedder):
        def embed(self, texts: Sequence[str]) -> list[list[float]]:
            raise ValueError("unusable vector")

    with pytest.raises(ValueError, match="unusable vector"):
        load_ordinance(migrated_url, tmp_path, embedder=FailingEmbedder())
    with psycopg.connect(migrated_url) as conn:
        assert conn.execute("SELECT count(*) FROM ams_docs.passages").fetchone() == (2,)


def test_no_connection_is_held_while_embedding(migrated_url: str, tmp_path: Path) -> None:
    open_while_embedding: list[int] = []

    class CountingEmbedder(FakeEmbedder):
        def embed(self, texts: Sequence[str]) -> list[list[float]]:
            with psycopg.connect(migrated_url) as conn:
                row = conn.execute(
                    "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() "
                    "AND backend_type = 'client backend' AND pid <> pg_backend_pid()"
                ).fetchone()
            assert row is not None
            open_while_embedding.append(row[0])
            return super().embed(texts)

    load_ordinance(migrated_url, tmp_path, embedder=CountingEmbedder())
    assert open_while_embedding == [0]


def test_reader_role_can_read_passages_and_search_entries_but_not_raw_pages(migrated_url: str) -> None:
    with psycopg.connect(migrated_url) as conn:
        passages = conn.execute(
            "SELECT has_table_privilege('ams_docs_reader', 'ams_docs.passages', 'SELECT')"
        ).fetchone()
        entries = conn.execute(
            "SELECT has_table_privilege('ams_docs_reader', 'ams_docs.search_entries', 'SELECT')"
        ).fetchone()
        raw = conn.execute("SELECT has_schema_privilege('ams_docs_reader', 'raw_ams_docs', 'USAGE')").fetchone()

    assert passages == (True,)
    assert entries == (True,)
    assert raw == (False,)


def test_a_corpus_description_with_a_digit_is_rejected() -> None:
    with pytest.raises(ValidationError, match="holds no digits; found 2024"):
        CorpusEntry(document_type="law", description="The 2024 housing ordinance.", splitter="housing_ordinance")
