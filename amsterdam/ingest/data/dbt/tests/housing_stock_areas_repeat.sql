{#
  Areas that appear more than once in the latest CBS Kerncijfers load. The table gives one row per region, and
  answers look an area up by its level and code: a repeated area would make a lookup pick between two rows with
  different figures; the build fails instead.
#}
SELECT area_level, area_code, count(*) AS rows
FROM {{ ref('housing_stock') }}
GROUP BY area_level, area_code
HAVING count(*) > 1
