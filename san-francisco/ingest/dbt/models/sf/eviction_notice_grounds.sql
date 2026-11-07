{# One row per notice and ground it gives. The ground flags are the dataset's true-or-false fields. #}
SELECT record ->> 'eviction_id' AS eviction_id, flag.key AS ground_key
FROM {{ source('raw_sf', 'eviction_notices') }}, jsonb_each(record) AS flag
WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf', 'eviction_notices') }}
    AND jsonb_typeof(flag.value) = 'boolean'
    AND flag.value = 'true'::jsonb
