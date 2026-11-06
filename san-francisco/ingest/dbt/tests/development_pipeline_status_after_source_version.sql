{#
  Projects whose status date is later than the date their snapshot's rows were published. Days in a status are
  counted to that date, so such a project would get a negative count; the build fails instead.
#}
SELECT snapshot, project_key, status_since, source_version
FROM {{ ref('development_pipeline') }}
WHERE status_since > source_version
