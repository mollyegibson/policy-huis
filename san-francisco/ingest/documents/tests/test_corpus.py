import hashlib
from collections.abc import Sequence
from pathlib import Path

import psycopg
import pytest
from policyhuis_ingest.archive import LocalArchive
from policyhuis_ingest.load import ingest
from policyhuis_ingest.source_types import load_sources
from policyhuis_ingest.testing import FakeFetcher, pdf

from sf_docs_ingest.corpus import build_passages, load_corpus, load_search_config
from sf_docs_ingest.settings import CORPUS_FILE, CORPUS_SCHEMA, RAW_SCHEMA, SEARCH_FILE, SOURCES_FILE
from tests.fixtures import pages


class FakeEmbedder:
    """Deterministic 2,560-dimension vectors from each text's hash, so tests need no Ollama."""

    model_id = "fake@000000000000"

    def __init__(self) -> None:
        self.calls = 0

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        self.calls += 1
        return [[(b + 1) / 256 for b in hashlib.sha256(t.encode()).digest()] * 80 for t in texts]


def load_rent_ordinance(url: str, archive: Path, embedder: FakeEmbedder | None = None) -> int:
    source = load_sources(SOURCES_FILE)["rent_ordinance"]
    fetcher = FakeFetcher({source.url: pdf([page.split("\n") for page in pages()])})
    entry = load_corpus(CORPUS_FILE)["rent_ordinance"]
    with psycopg.connect(url, autocommit=True) as conn:
        ingest("rent_ordinance", source, fetcher, LocalArchive(archive), conn, RAW_SCHEMA, "v1")
    subtree_chars = load_search_config(SEARCH_FILE).subtree_chars
    return build_passages(
        url, RAW_SCHEMA, CORPUS_SCHEMA, "rent_ordinance", entry, embedder or FakeEmbedder(), subtree_chars
    )


def test_every_document_in_the_corpus_is_a_source() -> None:
    assert set(load_corpus(CORPUS_FILE)) <= set(load_sources(SOURCES_FILE))


def test_passages_come_from_the_loaded_pages_with_the_manifest_s_version(migrated_url: str, tmp_path: Path) -> None:
    count = load_rent_ordinance(migrated_url, tmp_path)
    with psycopg.connect(migrated_url) as conn:
        document = conn.execute("SELECT document_type, version_date::text, publisher FROM sf_docs.documents").fetchone()
        description = conn.execute("SELECT description FROM sf_docs.documents").fetchone()
        parents = conn.execute("SELECT provision, parent_provision FROM sf_docs.passages ORDER BY ordinal").fetchall()

    assert count == 7
    assert document == ("law", "2026-06-29", "San Francisco Residential Rent Stabilization and Arbitration Board")
    assert ("37.9(a)(1)(A)", "37.9(a)(1)") in parents
    assert description == (load_corpus(CORPUS_FILE)["rent_ordinance"].description,)


def test_keyword_search_matches_a_provision_through_its_context(migrated_url: str, tmp_path: Path) -> None:
    load_rent_ordinance(migrated_url, tmp_path)
    with psycopg.connect(migrated_url) as conn:
        found = conn.execute(
            "SELECT provision FROM sf_docs.passages "
            "WHERE tsv @@ websearch_to_tsquery('english', 'landlord recover possession good faith') ORDER BY ordinal"
        ).fetchall()

    assert found == [("37.9(a)(2)",)]


def test_rebuilding_replaces_the_document_s_passages(migrated_url: str, tmp_path: Path) -> None:
    load_rent_ordinance(migrated_url, tmp_path)
    load_rent_ordinance(migrated_url, tmp_path)
    with psycopg.connect(migrated_url) as conn:
        assert conn.execute("SELECT count(*) FROM sf_docs.passages").fetchone() == (7,)


def test_every_passage_has_a_summary_and_an_own_search_entry(migrated_url: str, tmp_path: Path) -> None:
    load_rent_ordinance(migrated_url, tmp_path)
    with psycopg.connect(migrated_url) as conn:
        summaries = dict(conn.execute("SELECT provision, summary FROM sf_docs.passages").fetchall())
        entries = conn.execute(
            "SELECT provision, kind, embedding_model, vector_dims(embedding::vector) FROM sf_docs.search_entries"
        ).fetchall()

    assert summaries["37.9"] == "Sec. 37.9 Evictions"
    assert all(summaries.values())
    assert {p for p, kind, _, _ in entries if kind == "own"} == set(summaries)
    assert ("37.9(a)", "subtree", "fake@000000000000", 2560) in entries


def test_a_failed_embedding_leaves_the_stored_document_as_it_was(migrated_url: str, tmp_path: Path) -> None:
    load_rent_ordinance(migrated_url, tmp_path)

    class FailingEmbedder(FakeEmbedder):
        def embed(self, texts: Sequence[str]) -> list[list[float]]:
            raise ValueError("unusable vector")

    with pytest.raises(ValueError, match="unusable vector"):
        load_rent_ordinance(migrated_url, tmp_path, FailingEmbedder())
    with psycopg.connect(migrated_url) as conn:
        assert conn.execute("SELECT count(*) FROM sf_docs.passages").fetchone() == (7,)


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

    load_rent_ordinance(migrated_url, tmp_path, CountingEmbedder())
    assert open_while_embedding == [0]


def test_reader_role_can_read_passages_and_search_entries_but_not_raw_pages(migrated_url: str) -> None:
    with psycopg.connect(migrated_url) as conn:
        passages = conn.execute("SELECT has_table_privilege('sf_docs_reader', 'sf_docs.passages', 'SELECT')").fetchone()
        entries = conn.execute(
            "SELECT has_table_privilege('sf_docs_reader', 'sf_docs.search_entries', 'SELECT')"
        ).fetchone()
        raw = conn.execute("SELECT has_schema_privilege('sf_docs_reader', 'raw_sf_docs', 'USAGE')").fetchone()

    assert passages == (True,)
    assert entries == (True,)
    assert raw == (False,)
