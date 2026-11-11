"""Writing a document and its passages into a corpus schema, such as `policy_text_sf`."""

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

import psycopg
from psycopg import sql

from policyhuis_legal_text.outline import Passage
from policyhuis_legal_text.search_entries import SearchEntry
from policyhuis_legal_text.summary import summary

_PASSAGE_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "policyhuis:passage")


@dataclass(frozen=True)
class Document:
    """A loaded document as the corpus records it; everything but `document_type` comes from its load manifest row."""

    document_id: str
    title: str
    document_type: str
    publisher: str
    version_date: date
    source_url: str
    load_id: uuid.UUID
    archive_sha256: str


def passage_id(document: Document, provision: str) -> uuid.UUID:
    """The same ID for the same provision of the same document version, so passages can be rebuilt reproducibly."""
    return uuid.uuid5(_PASSAGE_NAMESPACE, f"{document.document_id}@{document.version_date.isoformat()}#{provision}")


@dataclass(frozen=True)
class EmbeddedEntry:
    entry: SearchEntry
    embedding: Sequence[float]


def write_document(
    conn: psycopg.Connection,
    schema: str,
    document: Document,
    passages: Sequence[Passage],
    entries: Sequence[EmbeddedEntry],
    embedding_model: str,
) -> None:
    """Replaces a document, its passages and its search entries in `schema` in one transaction."""
    documents = sql.Identifier(schema, "documents")
    passages_table = sql.Identifier(schema, "passages")
    entries_table = sql.Identifier(schema, "search_entries")
    provisions = {p.provision for p in passages}
    if stray := {e.entry.provision for e in entries} - provisions:
        raise ValueError(f"search entries name provisions with no passage: {sorted(stray)}")
    with conn.transaction():
        conn.execute(sql.SQL("DELETE FROM {} WHERE document_id = %s").format(entries_table), (document.document_id,))
        conn.execute(sql.SQL("DELETE FROM {} WHERE document_id = %s").format(passages_table), (document.document_id,))
        conn.execute(sql.SQL("DELETE FROM {} WHERE document_id = %s").format(documents), (document.document_id,))
        conn.execute(
            sql.SQL(
                "INSERT INTO {} (document_id, title, document_type, publisher, version_date, source_url, load_id, "
                "archive_sha256) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
            ).format(documents),
            (
                document.document_id,
                document.title,
                document.document_type,
                document.publisher,
                document.version_date,
                document.source_url,
                document.load_id,
                document.archive_sha256,
            ),
        )
        with conn.cursor() as cur:
            cur.executemany(
                sql.SQL(
                    "INSERT INTO {} (passage_id, document_id, provision, parent_provision, heading, ordinal, context, "
                    "text, summary) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
                ).format(passages_table),
                [
                    (
                        passage_id(document, p.provision),
                        document.document_id,
                        p.provision,
                        p.parent_provision,
                        p.heading,
                        p.ordinal,
                        p.context,
                        p.text,
                        summary(p),
                    )
                    for p in passages
                ],
            )
            cur.executemany(
                sql.SQL(
                    "INSERT INTO {} (document_id, provision, kind, text, embedding, embedding_model) "
                    "VALUES (%s, %s, %s, %s, %s::halfvec, %s)"
                ).format(entries_table),
                [
                    (
                        document.document_id,
                        e.entry.provision,
                        e.entry.kind,
                        e.entry.text,
                        "[" + ",".join(repr(float(x)) for x in e.embedding) + "]",
                        embedding_model,
                    )
                    for e in entries
                ],
            )
