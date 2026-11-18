{#
  Plans whose start of construction is realised after the date their snapshot states the numbers as of. A plan
  that says it started building after the register's peildatum would make answers about the register count it
  as building before it existed; the build fails instead.
#}
SELECT project_id, construction_start_realised, source_version
FROM {{ ref('planned_housing') }}
WHERE construction_start_realised > source_version
