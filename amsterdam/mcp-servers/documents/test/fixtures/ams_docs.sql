-- A small synthetic ams_docs schema, shaped like the migrations in amsterdam/ingest/documents.
-- Documents and passages are added as the corpus is confirmed; the schema is empty until then.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
DROP SCHEMA IF EXISTS ams_docs CASCADE;
CREATE SCHEMA ams_docs;

CREATE TABLE ams_docs.documents (
    document_id text PRIMARY KEY,
    title text NOT NULL,
    document_type text NOT NULL CHECK (document_type IN ('law', 'report', 'reference')),
    description text NOT NULL,
    publisher text NOT NULL,
    version_date date NOT NULL,
    source_url text NOT NULL,
    language text NOT NULL DEFAULT 'nl',
    load_id uuid NOT NULL,
    archive_sha256 char(64) NOT NULL
);

CREATE TABLE ams_docs.passages (
    passage_id uuid PRIMARY KEY,
    document_id text NOT NULL REFERENCES ams_docs.documents,
    provision text NOT NULL,
    parent_provision text,
    heading text NOT NULL,
    ordinal integer NOT NULL,
    context text NOT NULL,
    text_nl text NOT NULL,
    text_en text NOT NULL,
    translation_model text,
    summary text NOT NULL,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', context || ' ' || text_en)) STORED,
    UNIQUE (document_id, provision)
);
CREATE INDEX passages_tsv ON ams_docs.passages USING gin (tsv);

CREATE TABLE ams_docs.search_entries (
    entry_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id text NOT NULL,
    provision text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('own', 'subtree', 'outline')),
    text text NOT NULL,
    embedding halfvec(2560) NOT NULL,
    embedding_model text NOT NULL,
    FOREIGN KEY (document_id, provision) REFERENCES ams_docs.passages (document_id, provision),
    UNIQUE (document_id, provision, kind)
);
CREATE INDEX search_entries_embedding ON ams_docs.search_entries USING hnsw (embedding halfvec_cosine_ops);
