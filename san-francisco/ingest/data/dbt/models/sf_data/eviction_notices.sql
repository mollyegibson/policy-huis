SELECT
    record ->> 'eviction_id' AS eviction_id,
    (record ->> 'file_date')::timestamp::date AS file_date,
    date_trunc('month', (record ->> 'file_date')::timestamp)::date AS file_month,
    record ->> 'neighborhood' AS neighborhood,
    (record ->> 'supervisor_district')::integer AS supervisor_district,
    ST_SetSRID(ST_GeomFromGeoJSON(record -> 'shape'), 4326) AS geom,
    load_id
FROM {{ source('raw_sf_data', 'eviction_notices') }}
WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf_data', 'eviction_notices') }}
