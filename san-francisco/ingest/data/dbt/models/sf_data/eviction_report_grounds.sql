{#
  The table of reasons and Ordinance sections in the latest annual eviction report: the lines between its
  "Ordinance Section" header and its "Total Eviction Notices" line, each a count, the reason and the section,
  which is absent for "other or no reason given". The counts are the report year's and are not kept.
#}
WITH pages AS (
    SELECT load_id, (record ->> 'page')::integer AS page, record ->> 'text' AS text
    FROM {{ source('raw_sf_data', 'eviction_report') }}
    WHERE load_id = {{ policyhuis_macros.latest_load('raw_sf_data', 'eviction_report') }}
),

report_table AS (
    SELECT load_id, page, substring(text FROM 'Ordinance Section(.*)Total Eviction Notices') AS body
    FROM pages
    WHERE text LIKE '%Ordinance Section%Total Eviction Notices%'
),

table_lines AS (
    SELECT report_table.load_id, report_table.page, line
    FROM report_table, regexp_split_to_table(report_table.body, '\n') AS line
    WHERE line ~ '^\s*[0-9,]+\s*\*?\s+\S'
),

parsed AS (
    SELECT
        load_id,
        page,
        substring(line FROM '(37\.9\([a-z]\)(?:\([0-9]+\))?)\s*$') AS section,
        regexp_replace(
            regexp_replace(line, '^\s*[0-9,]+\s*\*?\s+|\s*37\.9\([a-z]\)(?:\([0-9]+\))?\s*$', '', 'g'),
            '\s+', ' ', 'g'
        ) AS reason
    FROM table_lines
)

SELECT trim(reason) AS reason, section, page, load_id
FROM parsed
