import re
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Literal

import psycopg
import yaml
from psycopg import sql
from pydantic import BaseModel, ConfigDict, Field, field_validator

from sf_docs_ingest import bla_affordable_housing, rent_ordinance
from sf_docs_ingest.passages.embed import Embedder
from sf_docs_ingest.passages.outline import Passage
from sf_docs_ingest.passages.search_entries import search_entries
from sf_docs_ingest.passages.store import Document, EmbeddedEntry, write_document

SPLITTERS: dict[str, Callable[[Sequence[str]], list[Passage]]] = {
    "rent_ordinance": rent_ordinance.passages,
    "bla_affordable_housing": bla_affordable_housing.passages,
}


class CorpusEntry(BaseModel):
    """One document's place in the corpus: its type, what it covers, and the rule that splits it into passages."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    document_type: Literal["law", "report", "reference"]
    description: str = Field(min_length=1)
    splitter: Literal["rent_ordinance", "bla_affordable_housing"]

    @field_validator("description")
    @classmethod
    def _no_digits(cls, description: str) -> str:
        """The docs server shows the description to the model, which would repeat a figure in it without a
        citation; figures, dates and section numbers belong in the passages."""
        digits = re.findall(r"\S*\d\S*", description)
        if digits:
            raise ValueError(f"a corpus description holds no digits; found {', '.join(digits)}")
        return description


class _CorpusFile(BaseModel):
    documents: dict[str, CorpusEntry]


class SearchConfig(BaseModel):
    """How search entries are built: the embedding API, model and host, and the size limit for a provision's entry
    with its descendants."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    embedding_api: str
    embedding_model: str
    embedding_host: str
    subtree_chars: int


def load_search_config(path: Path) -> SearchConfig:
    return SearchConfig.model_validate(yaml.safe_load(path.read_text()))


def load_corpus(path: Path) -> dict[str, CorpusEntry]:
    """The documents declared in a `corpus.yaml` file, keyed by document ID."""
    return dict(_CorpusFile.model_validate({"documents": yaml.safe_load(path.read_text())}).documents)


def build_passages(
    database_url: str,
    raw_schema: str,
    corpus_schema: str,
    document_id: str,
    entry: CorpusEntry,
    embedder: Embedder,
    subtree_chars: int,
) -> int:
    """Splits the latest load of a document into passages, embeds their search entries, and replaces the document's
    passages and search entries with them.

    The document's title, publisher, version and source come from its load manifest row; its pages from
    `document_pages`, in page order. Embedding happens before the write, so a failure leaves the stored document as
    it was. No connection is held while embedding, which takes minutes: a server may close an idle connection in that
    time (Neon suspends an idle compute). Returns the number of passages written.
    """
    with psycopg.connect(database_url, autocommit=True) as conn:
        document, passages = _read_document(conn, raw_schema, document_id, entry)
    entries = search_entries(passages, subtree_chars)
    vectors = embedder.embed([e.text for e in entries])
    embedded = [EmbeddedEntry(e, v) for e, v in zip(entries, vectors, strict=True)]
    with psycopg.connect(database_url, autocommit=True) as conn:
        write_document(conn, corpus_schema, document, passages, embedded, embedder.model_id)
    return len(passages)


def _read_document(
    conn: psycopg.Connection, raw_schema: str, document_id: str, entry: CorpusEntry
) -> tuple[Document, list[Passage]]:
    manifest = conn.execute(
        sql.SQL(
            "SELECT load_id, source_title, publisher, source_version, source_url, archive_sha256 FROM {} "
            "WHERE source_key = %s ORDER BY loaded_at DESC LIMIT 1"
        ).format(sql.Identifier(raw_schema, "load_manifest")),
        (document_id,),
    ).fetchone()
    if manifest is None:
        raise ValueError(f"{document_id} has not been loaded")
    load_id, title, publisher, version, source_url, digest = manifest
    if publisher is None:
        raise ValueError(f"{document_id} has no publisher in its load manifest row")
    pages = [
        row[0]
        for row in conn.execute(
            sql.SQL("SELECT record ->> 'text' FROM {} WHERE load_id = %s ORDER BY (record ->> 'page')::int").format(
                sql.Identifier(raw_schema, "document_pages")
            ),
            (load_id,),
        ).fetchall()
    ]
    passages = SPLITTERS[entry.splitter](pages)
    document = Document(
        document_id=document_id,
        title=title,
        document_type=entry.document_type,
        description=entry.description,
        publisher=publisher,
        version_date=version,
        source_url=source_url,
        load_id=load_id,
        archive_sha256=digest,
    )
    return document, passages
