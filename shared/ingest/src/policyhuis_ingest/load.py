import json
import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

from policyhuis_ingest.archive import Archive, sha256
from policyhuis_ingest.source_types import Fetcher, Source, download, parse_metadata, parse_rows


@dataclass(frozen=True)
class LoadResult:
    source_key: str
    load_id: uuid.UUID | None
    row_count: int
    skipped: bool


def loader_version(directory: Path) -> str:
    """The git commit of the repo containing `directory`, marked `-dirty` when the working tree has changes."""
    commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=directory, capture_output=True, text=True, check=True
    ).stdout.strip()
    status = subprocess.run(
        ["git", "status", "--porcelain"], cwd=directory, capture_output=True, text=True, check=True
    ).stdout
    return f"{commit}-dirty" if status.strip() else commit


def ingest(
    source_key: str,
    source: Source,
    fetcher: Fetcher,
    archive: Archive,
    conn: psycopg.Connection,
    raw_schema: str,
    version: str,
) -> LoadResult:
    """Download a source, archive it, then load the archived bytes into `raw_schema` in one transaction.

    The schema holds a `load_manifest` table and one table per source key with the columns
    `load_id`, `row_number`, `record` (jsonb) and `geom` (PostGIS geometry). A download whose data hash
    matches an earlier load of the same source is not loaded again.
    """
    manifest = sql.Identifier(raw_schema, "load_manifest")
    downloaded = download(source, fetcher)
    data_hash = sha256(downloaded.data)
    already = conn.execute(
        sql.SQL("SELECT 1 FROM {} WHERE source_key = %s AND archive_sha256 = %s").format(manifest),
        (source_key, data_hash),
    ).fetchone()
    if already:
        return LoadResult(source_key=source_key, load_id=None, row_count=0, skipped=True)

    meta = parse_metadata(source, downloaded.metadata)
    prefix = f"{raw_schema}/{source_key}/{meta.source_version.isoformat()}/{data_hash}"
    archive_key = f"{prefix}.{downloaded.data_extension}"
    metadata_key = f"{prefix}.metadata.json"
    archive.put(archive_key, downloaded.data)
    archive.put(metadata_key, downloaded.metadata)

    rows = parse_rows(source, downloaded.data)
    load_id = uuid.uuid4()
    insert_row = sql.SQL(
        "INSERT INTO {} (load_id, row_number, record, geom) VALUES "
        "(%s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))"
    ).format(sql.Identifier(raw_schema, source_key))
    with conn.transaction():
        conn.execute(
            sql.SQL(
                """
            INSERT INTO {} (
                load_id, source_key, source_url, data_url, source_version, archive_key, archive_sha256,
                metadata_archive_key, license, source_title, publisher, publisher_description,
                row_count, loader_version
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            ).format(manifest),
            (
                load_id,
                source_key,
                meta.source_url,
                downloaded.data_url,
                meta.source_version,
                archive_key,
                data_hash,
                metadata_key,
                meta.license,
                meta.title,
                meta.publisher,
                meta.description,
                len(rows),
                version,
            ),
        )
        with conn.cursor() as cur:
            cur.executemany(
                insert_row,
                [
                    (
                        load_id,
                        i,
                        Jsonb(row.record),
                        json.dumps(row.geometry) if row.geometry is not None else None,
                    )
                    for i, row in enumerate(rows, start=1)
                ],
            )
    return LoadResult(source_key=source_key, load_id=load_id, row_count=len(rows), skipped=False)
