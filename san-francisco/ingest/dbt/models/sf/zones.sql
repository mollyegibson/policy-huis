{# One row per flood or exposure zone; the zone key is its source key, and the rest comes from the source's metadata. #}
{% set zone_sources = ['slr_66in_100yr_storm', 'sfpuc_100yr_storm', 'air_pollutant_exposure_zone'] %}

{% for zone in zone_sources %}
SELECT
    '{{ zone }}' AS zone,
    m.source_title AS name,
    m.publisher,
    m.source_version AS source_edited_at,
    m.publisher_description,
    ST_Multi(ST_CollectionExtract(ST_Union(ST_MakeValid(r.geom)), 3)) AS geom,
    m.load_id
FROM {{ source('raw_sf', zone) }} AS r
INNER JOIN {{ source('raw_sf', 'load_manifest') }} AS m ON r.load_id = m.load_id
WHERE r.load_id = {{ policyhuis_macros.latest_load('raw_sf', zone) }}
GROUP BY m.load_id, m.source_title, m.publisher, m.source_version, m.publisher_description
{% if not loop.last %}UNION ALL{% endif %}
{% endfor %}
