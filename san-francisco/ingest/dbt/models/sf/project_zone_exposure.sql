{# Which projects fall inside which zone, for the latest development pipeline snapshot and the MOHCD pipeline. #}
WITH latest_snapshot AS (
    SELECT max(snapshot) AS snapshot FROM {{ ref('development_pipeline') }}
),

projects AS (
    SELECT 'development_pipeline' AS project_source, d.project_key AS project_id, d.geom
    FROM {{ ref('development_pipeline') }} AS d
    INNER JOIN latest_snapshot AS s ON d.snapshot = s.snapshot
    WHERE d.geom IS NOT NULL
    UNION ALL
    SELECT 'affordable_pipeline' AS project_source, a.project_id, a.geom
    FROM {{ ref('affordable_pipeline') }} AS a
)

SELECT p.project_source, p.project_id, z.zone
FROM projects AS p
INNER JOIN {{ ref('zones') }} AS z ON ST_Intersects(p.geom, z.geom)
