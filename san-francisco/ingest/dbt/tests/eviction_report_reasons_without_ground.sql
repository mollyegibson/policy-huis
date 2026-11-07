{#
  Reasons in the annual eviction report that no Eviction Notices ground column records, such as a section
  added to the ordinance after the dataset's columns were set. Reported, not fatal.
#}
{{ config(severity='warn') }}

SELECT report.reason, report.section
FROM {{ ref('eviction_report_grounds') }} AS report
LEFT JOIN {{ ref('eviction_grounds') }} AS grounds ON grounds.label = report.reason
WHERE grounds.ground_key IS NULL
