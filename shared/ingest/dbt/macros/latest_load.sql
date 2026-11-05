{# The load_id of the most recent load of a source, from a raw schema's load manifest declared as a dbt source. #}
{% macro latest_load(raw_source, source_key) -%}
    (
        SELECT load_id
        FROM {{ source(raw_source, 'load_manifest') }}
        WHERE source_key = '{{ source_key }}'
        ORDER BY loaded_at DESC
        LIMIT 1
    )
{%- endmacro %}
