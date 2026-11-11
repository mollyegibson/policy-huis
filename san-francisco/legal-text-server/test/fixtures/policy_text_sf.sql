-- A small synthetic policy_text_sf, shaped as after san-francisco/legal-text's migrations 0001 and 0002.
-- Search entries hold one-hot vectors, so a test query's vector decides the ranking exactly.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA policy_text_sf;

CREATE FUNCTION public.one_hot(k integer) RETURNS halfvec(2560) LANGUAGE sql IMMUTABLE AS $$
    SELECT array_agg(CASE WHEN i = k THEN 1 ELSE 0 END ORDER BY i)::real[]::halfvec(2560)
    FROM generate_series(1, 2560) AS i
$$;

CREATE TABLE policy_text_sf.documents (
    document_id text PRIMARY KEY, title text NOT NULL, document_type text NOT NULL, publisher text NOT NULL,
    version_date date NOT NULL, source_url text NOT NULL, load_id uuid NOT NULL, archive_sha256 char(64) NOT NULL
);
INSERT INTO policy_text_sf.documents VALUES
    ('rent_ordinance', 'Residential Rent Stabilization and Arbitration Ordinance', 'law',
     'San Francisco Residential Rent Stabilization and Arbitration Board', '2026-06-29',
     'https://media.api.sf.gov/documents/600_Ordinance_6-29-26.pdf', gen_random_uuid(), repeat('0', 64));

CREATE TABLE policy_text_sf.passages (
    passage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id text NOT NULL REFERENCES policy_text_sf.documents,
    provision text NOT NULL, parent_provision text, heading text NOT NULL, ordinal integer NOT NULL,
    context text NOT NULL, text text NOT NULL, summary text NOT NULL,
    UNIQUE (document_id, provision)
);
INSERT INTO policy_text_sf.passages (document_id, provision, parent_provision, heading, ordinal, context, text, summary) VALUES
    ('rent_ordinance', '37.2', NULL, 'Sec. 37.2 Definitions', 0, 'Sec. 37.2 Definitions',
     '[Amended by Ord. No. 1-80.]', 'Sec. 37.2 Definitions'),
    ('rent_ordinance', '37.2(r)', '37.2', 'Sec. 37.2 Definitions', 1, 'Sec. 37.2 Definitions',
     '(r) Rental Units. All residential dwelling units in the City.', '(r) Rental Units.'),
    ('rent_ordinance', '37.9', NULL, 'Sec. 37.9 Evictions', 2, 'Sec. 37.9 Evictions',
     '[Amended by Ord. No. 295-79.]', 'Sec. 37.9 Evictions'),
    ('rent_ordinance', '37.9(a)', '37.9', 'Sec. 37.9 Evictions', 3, 'Sec. 37.9 Evictions',
     '(a) A landlord shall not endeavor to recover possession of a rental unit unless:',
     '(a) A landlord shall not endeavor to recover possession of a rental unit unless:'),
    ('rent_ordinance', '37.9(a)(1)', '37.9(a)', 'Sec. 37.9 Evictions', 4,
     'Sec. 37.9 Evictions (a) A landlord shall not endeavor to recover possession of a rental unit unless:',
     '(1) The tenant has failed to pay the rent to which the landlord is lawfully entitled;',
     '(1) The tenant has failed to pay the rent to which the landlord is lawfully entitled;'),
    ('rent_ordinance', '37.9(a)(8)', '37.9(a)', 'Sec. 37.9 Evictions', 5,
     'Sec. 37.9 Evictions (a) A landlord shall not endeavor to recover possession of a rental unit unless:',
     '(8) The landlord seeks to recover possession in good faith, without ulterior reasons and with honest intent;',
     '(8) The landlord seeks to recover possession in good faith, without ulterior reasons and with honest intent;'),
    ('rent_ordinance', '37.9(a)(8)(ii)', '37.9(a)(8)', 'Sec. 37.9 Evictions', 6,
     'Sec. 37.9 Evictions (a) A landlord shall not endeavor to recover possession of a rental unit unless: (8) The landlord seeks to recover possession in good faith, without ulterior reasons and with honest intent;',
     '(ii) For the use or occupancy of the landlord''s children as their principal place of residency.',
     '(ii) For the use or occupancy of the landlord''s children as their principal place of residency.');

CREATE TABLE policy_text_sf.search_entries (
    entry_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id text NOT NULL, provision text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('own', 'subtree', 'outline')),
    text text NOT NULL, embedding halfvec(2560) NOT NULL, embedding_model text NOT NULL,
    FOREIGN KEY (document_id, provision) REFERENCES policy_text_sf.passages (document_id, provision),
    UNIQUE (document_id, provision, kind)
);
CREATE INDEX search_entries_embedding ON policy_text_sf.search_entries USING hnsw (embedding halfvec_cosine_ops);
INSERT INTO policy_text_sf.search_entries (document_id, provision, kind, text, embedding, embedding_model)
SELECT 'rent_ordinance', provision, kind, provision, one_hot(k), 'qwen3-embedding:4b@df5bd2e3c74c'
FROM (VALUES
    ('37.2', 'own', 10), ('37.2', 'subtree', 11), ('37.2(r)', 'own', 12),
    ('37.9', 'own', 20), ('37.9', 'outline', 21), ('37.9(a)', 'own', 22), ('37.9(a)', 'subtree', 2),
    ('37.9(a)(1)', 'own', 3), ('37.9(a)(8)', 'own', 24), ('37.9(a)(8)', 'subtree', 25),
    ('37.9(a)(8)(ii)', 'own', 1)
) AS e(provision, kind, k);
