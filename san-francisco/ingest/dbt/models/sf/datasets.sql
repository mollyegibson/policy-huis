SELECT DISTINCT ON (source_key)
    source_key AS dataset_key,
    source_title AS title,
    publisher,
    source_url,
    license,
    source_version,
    publisher_description
FROM {{ source('raw_sf', 'load_manifest') }}
ORDER BY source_key, loaded_at DESC
