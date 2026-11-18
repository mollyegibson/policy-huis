{#
  Labels whose building has a build year but no construction period. The construction period is the build
  year's band, and answers group by it: a band the bands macro does not name would drop such a label from
  every grouped count; the build fails instead.
#}
SELECT bag_verblijfsobject_id, build_year, build_year_band
FROM {{ ref('energy_labels') }}
WHERE build_year IS NOT NULL AND build_year_band IS NULL
