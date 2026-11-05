SELECT record ->> 'nhood' AS name
FROM {{ source('raw_sf', 'analysis_neighborhoods') }}
WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf', 'analysis_neighborhoods') }}
