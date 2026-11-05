{#
  Projects whose affordable units by income level do not add up to their affordable unit total.
  Reported, not fatal: the source publishes both, and answers use each as published.
#}
{{ config(severity='warn') }}

SELECT snapshot, project_key, affordable_units,
    coalesce(units_extremely_low, 0) + coalesce(units_very_low, 0) + coalesce(units_low, 0)
        + coalesce(units_moderate, 0) AS units_by_level
FROM {{ ref('development_pipeline') }}
WHERE coalesce(affordable_units, 0) <> coalesce(units_extremely_low, 0) + coalesce(units_very_low, 0)
    + coalesce(units_low, 0) + coalesce(units_moderate, 0)
