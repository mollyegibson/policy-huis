{#
  One row per ground flag in the latest Eviction Notices load, with the reason and Ordinance section the
  latest annual eviction report gives for it. The pairing of a flag with a report reason is
  eviction_ground_reason.
#}
WITH flags AS (
    SELECT DISTINCT flag.key AS ground_key
    FROM {{ source('raw_sf_data', 'eviction_notices') }}, jsonb_each(record) AS flag
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf_data', 'eviction_notices') }}
        AND jsonb_typeof(flag.value) = 'boolean'
)

SELECT
    flags.ground_key,
    report.reason AS label,
    report.section,
    report.load_id AS report_load_id
FROM flags
LEFT JOIN {{ ref('eviction_report_grounds') }} AS report
    ON report.reason = {{ eviction_ground_reason('flags.ground_key') }}
