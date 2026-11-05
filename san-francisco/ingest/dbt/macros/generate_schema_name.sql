{# Models build into the profile's schema (sf) as named, without dbt's target-schema prefix. #}
{% macro generate_schema_name(custom_schema_name, node) -%}
    {{ custom_schema_name if custom_schema_name is not none else target.schema }}
{%- endmacro %}
