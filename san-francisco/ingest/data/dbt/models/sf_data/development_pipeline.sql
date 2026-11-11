{#
  One row per project per quarterly snapshot. A project is identified by parcel, Planning case and
  building permit application together: a parcel can hold several projects. When a snapshot is loaded
  more than once, its latest load wins. `source_version` is that load's source version (the dataset's
  rows-updated date), which dated answers about the snapshot, such as days in a status, are counted to.
#}
WITH snapshot_loads AS (
    SELECT DISTINCT ON (snapshot) load_id, snapshot, source_version
    FROM (
        SELECT
            load_id,
            loaded_at,
            source_version,
            substring(publisher_description FROM 'as of the end of (\d{4} Q[1-4])') AS snapshot
        FROM {{ source('raw_sf_data', 'load_manifest') }}
        WHERE source_key = 'development_pipeline'
    ) AS loads
    ORDER BY snapshot, loaded_at DESC
)

SELECT
    l.snapshot,
    l.source_version,
    concat_ws(
        ':', r.record ->> 'blklot', coalesce(r.record ->> 'case_no', ''), coalesce(r.record ->> 'bpa_no', '')
    ) AS project_key,
    r.record ->> 'blklot' AS block_lot,
    r.record ->> 'nameaddr' AS name_or_address,
    CASE r.record ->> 'current_status'
        WHEN 'BP BP Issued' THEN 'BP Issued'
        ELSE r.record ->> 'current_status'
    END AS status,
    (r.record ->> 'current_status_date')::timestamp::date AS status_since,
    (r.record ->> 'approved_date_planning')::timestamp::date AS planning_approved_on,
    (r.record ->> 'net_pipeline_units')::integer AS net_units,
    (r.record ->> 'pipeline_affordable_units')::integer AS affordable_units,
    (r.record ->> 'bmr_units_ex_low')::integer AS units_extremely_low,
    (r.record ->> 'bmr_units_very_low')::integer AS units_very_low,
    (r.record ->> 'bmr_units_low')::integer AS units_low,
    (r.record ->> 'bmr_units_moderate')::integer AS units_moderate,
    {{ analysis_neighborhood_name("r.record ->> 'nhood41'") }} AS neighborhood,
    (r.record ->> 'sd22')::integer AS supervisor_district,
    CASE
        WHEN r.record ->> 'latitude' IS NOT NULL AND r.record ->> 'longitude' IS NOT NULL
            THEN ST_SetSRID(
                ST_MakePoint((r.record ->> 'longitude')::double precision, (r.record ->> 'latitude')::double precision),
                4326
            )
    END AS geom,
    r.load_id
FROM {{ source('raw_sf_data', 'development_pipeline') }} AS r
INNER JOIN snapshot_loads AS l ON r.load_id = l.load_id
