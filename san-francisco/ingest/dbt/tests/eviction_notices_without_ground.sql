{# Notices that give no ground. They stay in eviction_notices; reported, not fatal. #}
{{ config(severity='warn') }}

SELECT notices.eviction_id
FROM {{ ref('eviction_notices') }} AS notices
LEFT JOIN {{ ref('eviction_notice_grounds') }} AS grounds ON grounds.eviction_id = notices.eviction_id
WHERE grounds.eviction_id IS NULL
