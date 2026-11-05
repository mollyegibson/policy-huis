SELECT
    record ->> 'project_id' AS project_id,
    record ->> 'project_name' AS name,
    record ->> 'project_status' AS status,
    record ->> 'construction_status' AS construction_status,
    record ->> 'city_analysis_neighborhood' AS neighborhood,
    (record ->> 'supervisor_district')::integer AS supervisor_district,
    (record ->> 'total_project_units')::integer AS total_units,
    (record ->> 'mohcd_affordable_units')::integer AS affordable_units,
    (record ->> 'estimated_actual_construction_start_date')::timestamp::date AS estimated_start,
    (record ->> 'estimated_construction_completion')::timestamp::date AS estimated_completion,
    ST_SetSRID(
        ST_MakePoint((record ->> 'longitude')::double precision, (record ->> 'latitude')::double precision), 4326
    ) AS geom,
    load_id
FROM {{ source('raw_sf', 'affordable_pipeline') }}
WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf', 'affordable_pipeline') }}
